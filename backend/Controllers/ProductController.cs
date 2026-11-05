using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;
using backend.DTO;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.RegularExpressions;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProductController(AppDbContext context) : ControllerBase
{
    private const string Placeholder = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%237a7a7a'/></svg>";

    private IQueryable<Product> Catalog() => context.Products.AsSplitQuery()
        .Include(p => p.ProductImages)
        .Include(p => p.ProductVariants).ThenInclude(v => v.FkSize)
        .Include(p => p.ProductVariants).ThenInclude(v => v.FkColor);

    private static object AdminProduct(Product p) => new
    {
        p.PkProductId,
        p.DisplayId,
        p.Slug,
        p.ProductName,
        p.FkCategoryId,
        p.Description,
        p.BasePrice,
        p.Material,
        p.IsActive,
        hasSizes = p.ProductVariants.Any(v => v.IsActive && v.FkSize.Label != ProductOptions.DefaultSize),
        hasColors = p.ProductVariants.Any(v => v.IsActive && v.FkColor.Name != ProductOptions.DefaultColor),
        productImages = p.ProductImages.OrderBy(i => i.SortOrder),
        productVariants = p.ProductVariants.Where(v => v.IsActive).Select(v => new
        {
            v.PkProductVariantId,
            v.FkSizeId,
            v.FkColorId,
            v.Sku,
            v.StockQuantity,
            v.PriceOverride,
            v.IsActive
        })
    };

    [HttpGet]
    [HttpGet("GetProducts")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetProducts() => Ok((await Catalog().AsNoTracking().ToListAsync()).Select(AdminProduct));

    [HttpGet("ProductList")]
    public async Task<IActionResult> GetProductList()
    {
        // Project raw values in the query and do the ?? fallbacks in memory to avoid EF translation issues.
        var rows = await context.Products.AsNoTracking().Where(p => p.IsActive)
            .Select(p => new
            {
                p.PkProductId,
                p.ProductName,
                p.BasePrice,
                p.AvgRating,
                p.ReviewCount,
                p.SoldCount,
                p.FkCategoryId,
                StockLeft = p.ProductVariants.Where(v => v.IsActive).Sum(v => v.StockQuantity),
                DefaultVariantId = p.ProductVariants.Where(v => v.IsActive && v.StockQuantity > 0)
                    .OrderBy(v => v.PkProductVariantId).Select(v => v.PkProductVariantId).FirstOrDefault(),
                PrimaryImage = p.ProductImages.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder)
                    .Select(i => i.Url).FirstOrDefault(),
                ModelPreview = p.Product3DModels
                    .Where(m => m.IsActive && m.PreviewImageUrl != null && m.PreviewImageUrl != "")
                    .OrderByDescending(m => m.CreatedAt).Select(m => m.PreviewImageUrl).FirstOrDefault()
            }).ToListAsync();

        var products = rows.Select(p => new ProductListDTO
        {
            Id = p.PkProductId,
            Name = p.ProductName,
            Price = p.BasePrice,
            Rating = (double)p.AvgRating,
            ReviewCount = p.ReviewCount,
            SoldCount = p.SoldCount,
            StockLeft = p.StockLeft,
            DefaultVariantId = p.DefaultVariantId,
            ImageSrc = p.PrimaryImage ?? p.ModelPreview ?? Placeholder,
            Categories = new List<string> { p.FkCategoryId }
        }).ToList();

        return Ok(products);
    }

    [HttpGet("{id}")]
    [HttpGet("GetProductByID/{id}")]
    public async Task<IActionResult> GetProductById(string id)
    {
        var p = await Catalog().Include(x => x.Product3DModels).AsNoTracking()
            .FirstOrDefaultAsync(p => p.PkProductId == id && p.IsActive);
        if (p == null) return NotFound();
        var variants = p.ProductVariants.Where(v => v.IsActive).ToList();
        var model = p.Product3DModels.Where(m => m.IsActive).OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        return Ok(new ProductDetailDTO
        {
            Id = p.PkProductId,
            Name = p.ProductName,
            Description = p.Description ?? "",
            Price = p.BasePrice,
            Rating = (double)p.AvgRating,
            ReviewCount = p.ReviewCount,
            SoldCount = p.SoldCount,
            ImageSrc = p.ProductImages.OrderByDescending(i => i.IsPrimary).ThenBy(i => i.SortOrder).FirstOrDefault()?.Url
                ?? model?.PreviewImageUrl ?? Placeholder,
            ModelUrl = model?.ModelUrl,
            Stock = variants.Sum(v => v.StockQuantity),
            Sizes = variants.Where(v => v.FkSize.Label != ProductOptions.DefaultSize)
                .GroupBy(v => v.FkSize).OrderBy(g => g.Key.SortOrder)
                .Select(g => new SizeDTO(g.Key.Label, g.Any(v => v.StockQuantity > 0))).ToList(),
            Colors = variants.Where(v => v.FkColor.Name != ProductOptions.DefaultColor)
                .DistinctBy(v => v.FkColorId).Select(v => new ColorDTO(v.FkColor.Name, v.FkColor.HexCode)).ToList(),
            Variants = variants.Select(v => new VariantDTO(v.PkProductVariantId,
                v.FkColor.Name == ProductOptions.DefaultColor ? "" : v.FkColor.Name,
                v.FkSize.Label == ProductOptions.DefaultSize ? "" : v.FkSize.Label,
                v.StockQuantity, v.PriceOverride)).ToList()
        });
    }

    [HttpPost]
    [HttpPost("CreateProduct")]
    [Authorize(Roles = "Admin,Staff")]
    public Task<IActionResult> CreateProduct([FromBody] SaveProductRequest request) => Save(null, request);

    [HttpPut("{id}")]
    [HttpPut("UpdateProduct/{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public Task<IActionResult> UpdateProduct(string id, [FromBody] SaveProductRequest request) => Save(id, request);

    private async Task<IActionResult> Save(string? id, SaveProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProductName)) return BadRequest(new { message = "Product name is required." });
        if (!await context.Categories.AnyAsync(c => c.PkCategoryId == request.FkCategoryId))
            return BadRequest(new { message = "Choose an existing category." });
        if (request.Variants is { Count: 0 }) return BadRequest(new { message = "Add at least one inventory entry." });
        if (request.Images?.Any(i => !ValidImageUrl(i.Url)) == true)
            return BadRequest(new { message = "Images must use an HTTPS URL or an uploaded image path." });
        if (request.Variants != null)
        {
            if (request.Variants.Any(v => string.IsNullOrWhiteSpace(v.Sku)))
                return BadRequest(new { message = "Every inventory entry needs a SKU." });
            if (request.Variants.Select(v => v.Sku.Trim()).Distinct().Count() != request.Variants.Count)
                return BadRequest(new { message = "Each inventory entry must have a unique SKU." });
            if (request.Variants.GroupBy(v => (request.HasSizes ? v.SizeId : null, request.HasColors ? v.ColorId : null)).Any(g => g.Count() > 1))
                return BadRequest(new { message = "Duplicate size/color combinations. Remove extra entries when disabling options." });
            var sizeIds = request.Variants.Select(v => v.SizeId).Distinct().ToList();
            var colorIds = request.Variants.Select(v => v.ColorId).Distinct().ToList();
            if (request.HasSizes && (sizeIds.Contains(null) || await context.Sizes.CountAsync(s => sizeIds.Contains(s.PkSizeId) && s.Label != ProductOptions.DefaultSize) != sizeIds.Count))
                return BadRequest(new { message = "Select a valid size for every entry." });
            if (request.HasColors && (colorIds.Contains(null) || await context.Colors.CountAsync(c => colorIds.Contains(c.PkColorId) && c.Name != ProductOptions.DefaultColor) != colorIds.Count))
                return BadRequest(new { message = "Select a valid color for every entry." });
        }

        var product = id == null ? new Product() : await Catalog().FirstOrDefaultAsync(p => p.PkProductId == id);
        if (product == null) return NotFound();
        if (request.Variants?.Any(v => v.Id != null && !product.ProductVariants.Any(old => old.PkProductVariantId == v.Id)) == true)
            return BadRequest(new { message = "An inventory entry does not belong to this product." });

        await using var transaction = await context.Database.BeginTransactionAsync();
        try
        {
            product.DisplayId = string.IsNullOrWhiteSpace(request.DisplayId) ? product.DisplayId : request.DisplayId.Trim();
            product.Slug = string.IsNullOrWhiteSpace(request.Slug)
                ? Regex.Replace(request.ProductName.Trim().ToLowerInvariant(), @"[^\p{L}\p{N}]+", "-").Trim('-')
                : request.Slug.Trim();
            if (product.Slug.Length == 0) return BadRequest(new { message = "Enter a slug containing letters or numbers." });
            product.ProductName = request.ProductName.Trim();
            product.FkCategoryId = request.FkCategoryId;
            product.Description = request.Description;
            product.BasePrice = request.BasePrice;
            product.Material = request.Material;
            product.IsActive = request.IsActive;
            product.UpdatedAt = DateTime.UtcNow;
            if (id == null) { product.CreatedAt = DateTime.UtcNow; context.Products.Add(product); }

            if (request.Variants != null)
            {
                Size? defaultSize = null;
                Color? defaultColor = null;
                if (!request.HasSizes)
                {
                    defaultSize = await context.Sizes.FirstOrDefaultAsync(s => s.Label == ProductOptions.DefaultSize);
                    if (defaultSize == null) { defaultSize = new Size { Label = ProductOptions.DefaultSize, SortOrder = 0 }; context.Sizes.Add(defaultSize); await context.SaveChangesAsync(); }
                }
                if (!request.HasColors)
                {
                    defaultColor = await context.Colors.FirstOrDefaultAsync(c => c.Name == ProductOptions.DefaultColor);
                    if (defaultColor == null) { defaultColor = new Color { Name = ProductOptions.DefaultColor, HexCode = "#000000" }; context.Colors.Add(defaultColor); await context.SaveChangesAsync(); }
                }

                foreach (var v in request.Variants)
                {
                    var row = new ProductVariant
                    {
                        FkProductId = product.PkProductId,
                        FkSizeId = request.HasSizes ? (v.SizeId ?? defaultSize!.PkSizeId) : defaultSize!.PkSizeId,
                        FkColorId = request.HasColors ? (v.ColorId ?? defaultColor!.PkColorId) : defaultColor!.PkColorId,
                        Sku = v.Sku.Trim(),
                        StockQuantity = v.Stock,
                        PriceOverride = v.PriceOverride,
                        IsActive = v.IsActive,
                        ReorderLevel = 5
                    };
                    product.ProductVariants.Add(row);
                }
            }
            if (request.Images != null)
            {
                // Delete before replacing so the one-primary-image index is never violated.
                context.ProductImages.RemoveRange(product.ProductImages);
                await context.SaveChangesAsync();
                product.ProductImages.Clear();
                for (var i = 0; i < request.Images.Count; i++)
                {
                    var image = request.Images[i];
                    product.ProductImages.Add(new ProductImage { Url = image.Url, AltText = image.AltText, SortOrder = i, IsPrimary = i == 0 });
                }
            }
            await context.SaveChangesAsync();
            await transaction.CommitAsync();
            // Load the lookup navigations for newly assigned IDs before serializing.
            context.ChangeTracker.Clear();
            var saved = await Catalog().FirstAsync(p => p.PkProductId == product.PkProductId);
            return id == null ? CreatedAtAction(nameof(GetProductById), new { id = saved.PkProductId }, AdminProduct(saved)) : Ok(AdminProduct(saved));
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new { message = "The slug, display ID, SKU or option combination is already in use." });
        }
    }

    private static bool ValidImageUrl(string url) =>
        (url.StartsWith("/uploads/images/", StringComparison.Ordinal) && !url.Contains("..")) ||
        (Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == "https");

    [HttpDelete("{id}/deactivate")]
    [HttpDelete("DeactivateProduct/{id}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> DeactivateProduct(string id)
    {
        var product = await context.Products.FindAsync(id);
        if (product == null) return NotFound();
        product.IsActive = false; product.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return NoContent();
    }
}
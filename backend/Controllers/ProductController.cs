using backend.Data;
using backend.Models;
using backend.DTO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProductController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        try
        {
            var products = await _context.Products.ToListAsync();
            return Ok(products);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET PRODUCTS CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpGet("GetProducts")]
    public Task<IActionResult> GetProductsLegacy() => GetProducts();

    [HttpGet("ProductList")]
    public async Task<IActionResult> GetProductList()
    {
        try
        {
            // 1. Fetch raw data from the DB without complex ?? operators to avoid EF translation crashes
            var rawProducts = await _context.Products
                .AsNoTracking()
                .Where(p => p.IsActive)
                .Select(p => new
                {
                    p.PkProductId,
                    p.ProductName,
                    p.BasePrice,
                    p.AvgRating,
                    p.ReviewCount,
                    p.SoldCount,
                    StockLeft = p.ProductVariants.Any(v => v.IsActive)
                        ? p.ProductVariants.Where(v => v.IsActive).Sum(v => (int?)v.StockQuantity)
                        : null,
                    PrimaryImage = p.ProductImages
                        .OrderByDescending(img => img.IsPrimary)
                        .ThenBy(img => img.SortOrder)
                        .Select(img => img.Url)
                        .FirstOrDefault(),
                    ModelPreview = p.Product3DModels
                        .Where(m => m.IsActive && m.PreviewImageUrl != null && m.PreviewImageUrl != "")
                        .OrderByDescending(m => m.CreatedAt)
                        .Select(m => m.PreviewImageUrl)
                        .FirstOrDefault(),
                    CategorySlug = p.FkCategory != null ? p.FkCategory.Slug : null,
                    CategoryName = p.FkCategory != null ? p.FkCategory.CategoryName : null,
                    CategoryId = p.FkCategoryId
                })
                .ToListAsync();

            // 2. Perform the fallback mapping safely in memory
            var products = rawProducts.Select(p => new ProductListDTO
            {
                Id = p.PkProductId,
                Name = p.ProductName ?? string.Empty,
                Price = p.BasePrice,
                SalePrice = null,
                Rating = p.ReviewCount > 0 ? (double)p.AvgRating : 5.0,
                ReviewCount = p.ReviewCount,
                SoldCount = p.SoldCount,
                StockLeft = p.StockLeft,
                Badge = null,
                ImageSrc = p.PrimaryImage
                    ?? p.ModelPreview
                    ?? "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%237a7a7a'/></svg>",
                Categories = new List<string>
                {
                    p.CategorySlug?.ToLower() ?? "",
                    p.CategoryName?.ToLower() ?? "",
                    p.CategoryId ?? ""
                }.Where(s => !string.IsNullOrEmpty(s)).ToList()
            }).ToList();

            return Ok(products);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(string id)
    {
        try
        {
            var product = await _context.Products
                .Include(p => p.ProductImages)
                .Include(p => p.Product3DModels)
                .Include(p => p.ProductVariants).ThenInclude(v => v.FkColor)
                .Include(p => p.ProductVariants).ThenInclude(v => v.FkSize)
                .FirstOrDefaultAsync(p => p.PkProductId == id);

            if (product == null) return NotFound();

            var activeVariants = product.ProductVariants.Where(v => v.IsActive).ToList();

            var standardSizes = new[] { "S", "M", "L", "XL" };
            var bySize = activeVariants
                .GroupBy(v => v.FkSize.Label.ToUpper())
                .ToDictionary(g => g.Key, g => new { InStock = g.Any(v => v.StockQuantity > 0), Order = g.Min(v => v.FkSize.SortOrder) });

            var sizes = standardSizes
                .Select((label, i) => (Label: label, Order: i, Available: !bySize.TryGetValue(label, out var info) || info.InStock))
                .Concat(bySize
                    .Where(kv => !standardSizes.Contains(kv.Key))
                    .Select(kv => (Label: kv.Key, Order: 100 + kv.Value.Order, Available: kv.Value.InStock)))
                .OrderBy(x => x.Order)
                .Select(x => new SizeDTO(x.Label, x.Available))
                .ToList();

            var colors = activeVariants.Any()
                ? activeVariants
                    .Select(v => v.FkColor)
                    .DistinctBy(c => c.PkColorId)
                    .Select(c => new ColorDTO(c.Name, c.HexCode))
                    .ToList()
                : new List<ColorDTO> { new ColorDTO("Standard", "#000000") };

            var active3DModel = product.Product3DModels?
                .Where(m => m.IsActive)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefault();

            var thumbnailUrl = product.ProductImages?
                .OrderByDescending(img => img.IsPrimary)
                .ThenBy(img => img.SortOrder)
                .Select(img => img.Url)
                .FirstOrDefault()
                ?? active3DModel?.PreviewImageUrl
                ?? "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='710' height='981'><rect width='710' height='981' fill='%237a7a7a'/></svg>";

            var detail = new ProductDetailDTO
            {
                Id = product.PkProductId,
                Name = product.ProductName ?? string.Empty,
                Description = product.Description ?? string.Empty,
                Price = product.BasePrice,
                SalePrice = null,
                Rating = product.ReviewCount > 0 ? (double)product.AvgRating : 5.0,
                ReviewCount = product.ReviewCount,
                SoldCount = product.SoldCount,
                ImageSrc = thumbnailUrl,
                ModelUrl = active3DModel?.ModelUrl,
                Stock = activeVariants.Any() ? activeVariants.Sum(v => v.StockQuantity) : 10,
                Colors = colors,
                Sizes = sizes
            };

            return Ok(detail);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
        }
    }

    [HttpGet("GetProductByID/{id}")]
    public Task<IActionResult> GetProductByIdLegacy(string id) => GetProductById(id);

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        try
        {
            var product = new Product
            {
                DisplayId = request.DisplayId,
                Slug = request.Slug,
                ProductName = request.ProductName,
                FkCategoryId = request.FkCategoryId,
                Description = request.Description,
                BasePrice = request.BasePrice,
                Material = request.Material,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetProductById), new { id = product.PkProductId }, product);
        }
        catch (DbUpdateException dbEx)
        {
            var dbError = dbEx.InnerException?.Message ?? dbEx.Message;
            Console.WriteLine($"=== CREATE PRODUCT DB CRASH ===\n{dbEx}");
            return StatusCode(500, new { error = "DatabaseUpdateFailed", details = dbError, stackTrace = dbEx.ToString() });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== CREATE PRODUCT CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPost("CreateProduct")]
    public Task<IActionResult> CreateProductLegacy([FromBody] CreateProductRequest request) => CreateProduct(request);

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] Product updatedProduct)
    {
        try
        {
            if (id != updatedProduct.PkProductId) return BadRequest("Product ID mismatch.");

            var existingProduct = await _context.Products.FindAsync(id);
            if (existingProduct == null) return NotFound();

            existingProduct.DisplayId = updatedProduct.DisplayId;
            existingProduct.Slug = updatedProduct.Slug;
            existingProduct.ProductName = updatedProduct.ProductName;
            existingProduct.FkCategoryId = updatedProduct.FkCategoryId;
            existingProduct.Description = updatedProduct.Description;
            existingProduct.BasePrice = updatedProduct.BasePrice;
            existingProduct.Material = updatedProduct.Material;
            existingProduct.IsActive = updatedProduct.IsActive;
            existingProduct.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException dbEx)
        {
            var dbError = dbEx.InnerException?.Message ?? dbEx.Message;
            Console.WriteLine($"=== UPDATE PRODUCT DB CRASH ===\n{dbEx}");
            return StatusCode(500, new { error = "DatabaseUpdateFailed", details = dbError, stackTrace = dbEx.ToString() });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== UPDATE PRODUCT CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPut("UpdateProduct/{id}")]
    public Task<IActionResult> UpdateProductLegacy(string id, [FromBody] Product updatedProduct) => UpdateProduct(id, updatedProduct);

    [HttpDelete("{id}/deactivate")]
    public async Task<IActionResult> DeactivateProduct(string id)
    {
        try
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== DEACTIVATE PRODUCT CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpDelete("DeactivateProduct/{id}")]
    public Task<IActionResult> DeactivateProductLegacy(string id) => DeactivateProduct(id);
}
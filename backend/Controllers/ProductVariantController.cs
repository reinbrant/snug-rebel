using Microsoft.AspNetCore.Authorization;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

public record CreateVariantRequest(
    string FkProductId,
    long FkSizeId,
    long FkColorId,
    string Sku,
    int StockQuantity,
    decimal? PriceOverride = null,
    int ReorderLevel = 5,
    bool IsActive = true
);

[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
[ApiController]
public class ProductVariantController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductVariantController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateVariant([FromBody] CreateVariantRequest request)
    {
        var variant = new ProductVariant
        {
            FkProductId = request.FkProductId,
            FkSizeId = request.FkSizeId,
            FkColorId = request.FkColorId,
            Sku = request.Sku,
            StockQuantity = request.StockQuantity,
            PriceOverride = request.PriceOverride,
            ReorderLevel = request.ReorderLevel,
            IsActive = request.IsActive
        };

        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync();
        return Ok(variant);
    }

    /// <summary>
    /// One-off helper: gives every active product that has NO variants a default set
    /// (S, M, L, XL in the first color, 50 in stock each) so it can be added to a cart.
    /// Safe to call repeatedly. Products that already have variants are untouched.
    /// </summary>
    [HttpPost("seed-defaults")]
    public async Task<IActionResult> SeedDefaultVariants([FromQuery] int stock = 50)
    {
        var color = await _context.Colors.OrderBy(c => c.PkColorId).FirstOrDefaultAsync();
        if (color == null)
        {
            color = new Color { Name = "Standard", HexCode = "#000000" };
            _context.Colors.Add(color);
            await _context.SaveChangesAsync();
        }

        var labels = new[] { "S", "M", "L", "XL" };
        var sizes = new List<Size>();
        for (var i = 0; i < labels.Length; i++)
        {
            var label = labels[i];
            var size = await _context.Sizes.FirstOrDefaultAsync(s => s.Label.ToLower() == label.ToLower());
            if (size == null)
            {
                size = new Size { Label = label, SortOrder = i + 1 };
                _context.Sizes.Add(size);
                await _context.SaveChangesAsync();
            }
            sizes.Add(size);
        }

        var productIds = await _context.Products
            .Where(p => p.IsActive && !p.ProductVariants.Any())
            .Select(p => p.PkProductId)
            .ToListAsync();

        foreach (var productId in productIds)
        {
            foreach (var size in sizes)
            {
                _context.ProductVariants.Add(new ProductVariant
                {
                    FkProductId = productId,
                    FkSizeId = size.PkSizeId,
                    FkColorId = color.PkColorId,
                    // SKU must be unique and fit in 64 chars
                    Sku = $"{productId}-{size.Label}".ToUpper(),
                    StockQuantity = stock,
                    ReorderLevel = 5,
                    IsActive = true
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { productsSeeded = productIds.Count, variantsCreated = productIds.Count * sizes.Count });
    }
}
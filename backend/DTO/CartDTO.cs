using System.Collections.Generic;
using System.Linq;

namespace backend.DTO;

public class CartDTO
{
    public string PkCartId { get; set; } = null!;
    public string? FkUserId { get; set; }
    public string? SessionToken { get; set; }
    public List<CartItemDTO> Items { get; set; } = new();
    public int TotalItems => Items?.Sum(i => i.Quantity) ?? 0;
}

public class CartItemDTO
{
    public string PkCartItemId { get; set; } = null!;
    public string FkCartId { get; set; } = null!;
    public string FkProductVariantId { get; set; } = null!;
    public int Quantity { get; set; }

    // Cart item details for frontend cart
    public string? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? ImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ColorName { get; set; }
    public string? SizeLabel { get; set; }
    public int StockQuantity { get; set; }
}

public class CartItemRequest
{
    // Preferred: ProductId + Size. A size IS the variant, the backend finds or creates the row.
    public string? ProductId { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }

    // Still accepted: an exact product_variants id (or the old "var_{product}_{color}_{size}" format)
    public string? ProductVariantId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class AddToCartRequest
{
    public string? UserId { get; set; }
    public string? SessionToken { get; set; }

    // Single item payload fields
    public string? ProductId { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? ProductVariantId { get; set; }
    public int? Quantity { get; set; }

    // Multi-item payload list
    public List<CartItemRequest>? Items { get; set; }
}

public class UpdateCartItemRequest
{
    // Send a quantity to change how many, a size and/or color to switch variant, or both.
    public int? Quantity { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
}

public class MergeCartRequest
{
    public string SessionToken { get; set; } = null!;
    public string UserId { get; set; } = null!;
}
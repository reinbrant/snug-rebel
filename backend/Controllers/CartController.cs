using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTO;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CartController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CartController(AppDbContext context)
        {
            _context = context;
        }

        private IQueryable<Cart> QueryCartWithDetails()
        {
            return _context.Carts
                .AsSplitQuery()
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.FkProductVariant)
                        .ThenInclude(pv => pv.FkProduct)
                            .ThenInclude(p => p.ProductImages)
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.FkProductVariant)
                        .ThenInclude(pv => pv.FkColor)
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.FkProductVariant)
                        .ThenInclude(pv => pv.FkSize);
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetCartByUserId(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId)) return BadRequest(new { error = "InvalidUserId", message = "The userId parameter cannot be null or empty." });

                var cart = await QueryCartWithDetails().FirstOrDefaultAsync(c => c.FkUserId == userId);
                if (cart == null) return NotFound(new { error = "CartNotFound", message = $"No active cart found for User ID '{userId}'." });

                return Ok(MapToCartDto(cart));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== GET CART BY USER CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        [HttpGet("session/{sessionToken}")]
        public async Task<IActionResult> GetCartBySessionId(string sessionToken)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(sessionToken)) return BadRequest(new { error = "InvalidSessionToken", message = "The sessionToken parameter cannot be null or empty." });

                var cart = await QueryCartWithDetails().FirstOrDefaultAsync(c => c.SessionToken == sessionToken);
                if (cart == null) return NotFound(new { error = "CartNotFound", message = $"No active cart found for Session Token '{sessionToken}'." });

                return Ok(MapToCartDto(cart));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== GET CART BY SESSION CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
        {
            try
            {
                if (request == null) return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

                string? normalizedUserId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId;
                string? normalizedSessionToken = string.IsNullOrWhiteSpace(request.SessionToken) ? null : request.SessionToken;

                if (normalizedUserId == null && normalizedSessionToken == null)
                    return BadRequest(new { error = "MissingCartIdentifier", message = "At least one owner identifier must be provided." });

                var itemsToAdd = request.Items ?? new List<CartItemRequest>();
                if (!string.IsNullOrWhiteSpace(request.ProductVariantId) || !string.IsNullOrWhiteSpace(request.ProductId))
                {
                    itemsToAdd.Add(new CartItemRequest
                    {
                        ProductId = request.ProductId,
                        Size = request.Size,
                        Color = request.Color,
                        ProductVariantId = request.ProductVariantId,
                        Quantity = request.Quantity ?? 1
                    });
                }

                var validItems = itemsToAdd
                    .Where(i => i.Quantity > 0 && (!string.IsNullOrWhiteSpace(i.ProductId) || !string.IsNullOrWhiteSpace(i.ProductVariantId)))
                    .ToList();
                if (!validItems.Any()) return BadRequest(new { error = "NoValidItems", message = "At least one item with a ProductId (and optional Size) and quantity > 0 must be provided." });

                var cart = await _context.Carts
                    .Include(c => c.CartItems)
                    .FirstOrDefaultAsync(c => (normalizedUserId != null && c.FkUserId == normalizedUserId) || (normalizedSessionToken != null && c.SessionToken == normalizedSessionToken));

                if (cart == null)
                {
                    cart = new Cart { FkUserId = normalizedUserId, SessionToken = normalizedSessionToken, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
                    _context.Carts.Add(cart);
                }
                else
                {
                    cart.UpdatedAt = DateTime.UtcNow;
                }

                foreach (var item in validItems)
                {
                    var variant = await ResolveVariantAsync(item.ProductVariantId, item.ProductId, item.Size, item.Color);

                    if (variant == null)
                    {
                        return NotFound(new
                        {
                            error = "ProductVariantNotFound",
                            message = $"Product '{item.ProductId ?? item.ProductVariantId}' (size '{item.Size ?? "default"}') could not be found."
                        });
                    }

                    var existingItem = cart.CartItems.FirstOrDefault(ci => ci.FkProductVariantId == variant.PkProductVariantId);
                    var nextQty = (existingItem?.Quantity ?? 0) + item.Quantity;

                    if (nextQty > variant.StockQuantity)
                    {
                        return Conflict(new { error = "InsufficientStock", message = $"Only {variant.StockQuantity} in stock." });
                    }

                    if (existingItem != null)
                    {
                        existingItem.Quantity = nextQty;
                    }
                    else
                    {
                        var newItem = new CartItem
                        {
                            FkCart = cart,
                            FkProductVariantId = variant.PkProductVariantId,
                            Quantity = item.Quantity,
                            AddedAt = DateTime.UtcNow
                        };
                        _context.CartItems.Add(newItem);
                    }
                }

                await _context.SaveChangesAsync();

                var hydratedCart = await QueryCartWithDetails().FirstAsync(c => c.PkCartId == cart.PkCartId);
                return Ok(MapToCartDto(hydratedCart));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== ADD TO CART CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        /// <summary>
        /// Resolve only inventory configured by an administrator; purchases never create stock.
        /// </summary>
        private async Task<ProductVariant?> ResolveVariantAsync(string? variantId, string? productId, string? sizeLabel, string? colorName)
        {
            var query = _context.ProductVariants.Include(v => v.FkColor).Include(v => v.FkSize)
                .Where(v => v.IsActive && v.FkProduct.IsActive);
            if (!string.IsNullOrWhiteSpace(variantId))
                return await query.FirstOrDefaultAsync(v => v.PkProductVariantId == variantId && (productId == null || v.FkProductId == productId));
            if (string.IsNullOrWhiteSpace(productId)) return null;
            query = query.Where(v => v.FkProductId == productId);
            if (!string.IsNullOrWhiteSpace(sizeLabel)) query = query.Where(v => v.FkSize.Label.ToLower() == sizeLabel.Trim().ToLower());
            if (!string.IsNullOrWhiteSpace(colorName)) query = query.Where(v => v.FkColor.Name.ToLower() == colorName.Trim().ToLower());
            return await query.OrderByDescending(v => v.StockQuantity > 0).ThenBy(v => v.FkSize.SortOrder).ThenBy(v => v.PkProductVariantId).FirstOrDefaultAsync();
        }

        [HttpPut("item/{cartItemId}")]
        public async Task<IActionResult> UpdateItemQuantity(string cartItemId, [FromBody] UpdateCartItemRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(cartItemId)) return BadRequest(new { error = "InvalidCartItemId", message = "The cartItemId cannot be null or empty." });
                if (request == null) return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

                var changingVariant = !string.IsNullOrWhiteSpace(request.Size) || !string.IsNullOrWhiteSpace(request.Color);
                if (request.Quantity == null && !changingVariant)
                    return BadRequest(new { error = "NothingToUpdate", message = "Provide a quantity, a size or a color." });

                var cartItem = await _context.CartItems
                    .Include(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkColor)
                    .Include(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkSize)
                    .FirstOrDefaultAsync(ci => ci.PkCartItemId == cartItemId);
                if (cartItem == null) return NotFound(new { error = "CartItemNotFound", message = $"Cart item '{cartItemId}' was not found." });

                var cartId = cartItem.FkCartId;

                if (request.Quantity is <= 0)
                {
                    _context.CartItems.Remove(cartItem);
                    await _context.SaveChangesAsync();
                    var hydratedCart = await QueryCartWithDetails().FirstAsync(c => c.PkCartId == cartId);
                    return Ok(MapToCartDto(hydratedCart));
                }

                var quantity = request.Quantity ?? cartItem.Quantity;

                // Switch to another size / color of the same product
                if (changingVariant && cartItem.FkProductVariant != null)
                {
                    var current = cartItem.FkProductVariant;
                    var target = await ResolveVariantChangeAsync(current, request.Size, request.Color);
                    if (target == null)
                        return NotFound(new { error = "ProductVariantNotFound", message = "That size or color isn’t available for this item." });

                    if (target.PkProductVariantId != current.PkProductVariantId)
                    {
                        // Already have that exact variant in this cart? Fold this line into it.
                        var twin = await _context.CartItems.FirstOrDefaultAsync(ci =>
                            ci.FkCartId == cartItem.FkCartId &&
                            ci.FkProductVariantId == target.PkProductVariantId &&
                            ci.PkCartItemId != cartItem.PkCartItemId);

                        var merged = quantity + (twin?.Quantity ?? 0);
                        if (merged > target.StockQuantity)
                            return Conflict(new { error = "InsufficientStock", message = $"Only {target.StockQuantity} in stock." });

                        if (twin != null)
                        {
                            twin.Quantity = merged;
                            _context.CartItems.Remove(cartItem);
                        }
                        else
                        {
                            cartItem.FkProductVariant = target;
                            cartItem.FkProductVariantId = target.PkProductVariantId;
                            cartItem.Quantity = quantity;
                        }

                        await _context.SaveChangesAsync();
                        var hydratedCart = await QueryCartWithDetails().FirstAsync(c => c.PkCartId == cartId);
                        return Ok(MapToCartDto(hydratedCart));
                    }
                }

                if (cartItem.FkProductVariant != null && quantity > cartItem.FkProductVariant.StockQuantity)
                {
                    return Conflict(new { error = "InsufficientStock", message = $"Only {cartItem.FkProductVariant.StockQuantity} in stock." });
                }

                cartItem.Quantity = quantity;
                await _context.SaveChangesAsync();
                var hydratedCartFinal = await QueryCartWithDetails().FirstAsync(c => c.PkCartId == cartId);
                return Ok(MapToCartDto(hydratedCartFinal));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== UPDATE ITEM QUANTITY CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
            }
        }

        /// Finds the variant of the same product for a new size and/or color (the one not given stays as it is).
        /// Only configured combinations can be selected.
        private Task<ProductVariant?> ResolveVariantChangeAsync(ProductVariant current, string? sizeLabel, string? colorName) =>
            ResolveVariantAsync(null, current.FkProductId,
                string.IsNullOrWhiteSpace(sizeLabel) ? current.FkSize.Label : sizeLabel,
                string.IsNullOrWhiteSpace(colorName) ? current.FkColor.Name : colorName);

        [HttpDelete("item/{cartItemId}")]
        public async Task<IActionResult> RemoveCartItem(string cartItemId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(cartItemId)) return BadRequest(new { error = "InvalidCartItemId", message = "The cartItemId cannot be null or empty." });

                var cartItem = await _context.CartItems.FirstOrDefaultAsync(ci => ci.PkCartItemId == cartItemId);
                if (cartItem == null) return NotFound(new { error = "CartItemNotFound", message = $"Cart item '{cartItemId}' was not found." });

                var cartId = cartItem.FkCartId;

                _context.CartItems.Remove(cartItem);
                await _context.SaveChangesAsync();

                var hydratedCart = await QueryCartWithDetails().FirstAsync(c => c.PkCartId == cartId);
                return Ok(MapToCartDto(hydratedCart));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== REMOVE CART ITEM CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        [HttpDelete("{cartId}/clear")]
        public async Task<IActionResult> ClearCart(string cartId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(cartId)) return BadRequest(new { error = "InvalidCartId", message = "The cartId cannot be null or empty." });

                var cartExists = await _context.Carts.AnyAsync(c => c.PkCartId == cartId);
                if (!cartExists) return NotFound(new { error = "CartNotFound", message = $"Cart with ID '{cartId}' does not exist." });

                var cartItems = await _context.CartItems.Where(ci => ci.FkCartId == cartId).ToListAsync();
                if (!cartItems.Any()) return Ok(new { message = $"Cart '{cartId}' is already empty." });

                _context.CartItems.RemoveRange(cartItems);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Successfully cleared {cartItems.Count} item(s) from cart '{cartId}'." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== CLEAR CART CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        private static CartDTO MapToCartDto(Cart cart)
        {
            return new CartDTO
            {
                PkCartId = cart.PkCartId,
                FkUserId = cart.FkUserId,
                SessionToken = cart.SessionToken,
                Items = cart.CartItems.Select(ci =>
                {
                    var v = ci.FkProductVariant;
                    var p = v?.FkProduct;
                    var img = p?.ProductImages?.FirstOrDefault(i => i.IsPrimary)?.Url
                              ?? p?.ProductImages?.FirstOrDefault()?.Url;

                    return new CartItemDTO
                    {
                        PkCartItemId = ci.PkCartItemId,
                        FkCartId = ci.FkCartId,
                        FkProductVariantId = ci.FkProductVariantId,
                        Quantity = ci.Quantity,
                        ProductId = p?.PkProductId ?? string.Empty,
                        ProductName = p?.ProductName ?? "Item",
                        ImageUrl = img,
                        UnitPrice = v?.PriceOverride ?? p?.BasePrice ?? 0m,
                        ColorName = v?.FkColor?.Name,
                        SizeLabel = v?.FkSize?.Label,
                        StockQuantity = v?.StockQuantity ?? 99
                    };
                }).ToList()
            };
        }
    }
}
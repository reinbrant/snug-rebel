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
                    var variant = await ResolveVariantAsync(item.ProductVariantId, item.ProductId, item.Size);

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
        /// A size IS the variant. Finds the variant row for (product, size) and creates it on first use,
        /// so products never need hand-made product_variants rows before they can be added to a cart.
        /// </summary>
        private async Task<ProductVariant?> ResolveVariantAsync(string? variantId, string? productId, string? sizeLabel)
        {
            IQueryable<ProductVariant> Variants() => _context.ProductVariants.Include(pv => pv.FkColor).Include(pv => pv.FkSize);

            variantId = variantId?.Trim();
            productId = productId?.Trim();
            sizeLabel = sizeLabel?.Trim();

            // 1. An exact variant id wins
            if (!string.IsNullOrEmpty(variantId))
            {
                var direct = await Variants().FirstOrDefaultAsync(pv => pv.PkProductVariantId == variantId);
                if (direct != null) return direct;

                // Old clients: "var_{productId}_{color}_{size}" or "{productId}_{size}"
                if (string.IsNullOrEmpty(productId))
                {
                    var working = variantId.StartsWith("var_") ? variantId.Substring(4) : variantId;
                    var parts = working.Split('_');
                    if (parts.Length >= 2)
                    {
                        productId = parts[0];
                        sizeLabel = parts[^1];
                    }
                }
            }

            if (string.IsNullOrEmpty(productId)) return null;
            if (!await _context.Products.AnyAsync(p => p.PkProductId == productId)) return null;

            // 2. No size given (e.g. the shop card button): use the product's first size, else "S"
            if (string.IsNullOrEmpty(sizeLabel))
            {
                var first = await Variants()
                    .Where(pv => pv.FkProductId == productId && pv.IsActive)
                    .OrderBy(pv => pv.FkSize.SortOrder)
                    .FirstOrDefaultAsync();
                if (first != null) return first;
                sizeLabel = "S";
            }

            // 3. Existing variant for this product + size
            var lower = sizeLabel.ToLower();
            var existing = await Variants()
                .Where(pv => pv.FkProductId == productId && pv.IsActive && pv.FkSize.Label.ToLower() == lower)
                .FirstOrDefaultAsync();
            if (existing != null) return existing;

            // 4. First time this size is bought: create the variant
            var label = sizeLabel.ToUpper();
            var size = await _context.Sizes.FirstOrDefaultAsync(s => s.Label.ToLower() == lower);
            if (size == null)
            {
                var order = Array.IndexOf(new[] { "S", "M", "L", "XL" }, label);
                size = new Size { Label = label, SortOrder = order >= 0 ? order + 1 : 99 };
                _context.Sizes.Add(size);
                await _context.SaveChangesAsync();
            }

            var color = await _context.Colors.OrderBy(c => c.PkColorId).FirstOrDefaultAsync();
            if (color == null)
            {
                color = new Color { Name = "Standard", HexCode = "#000000" };
                _context.Colors.Add(color);
                await _context.SaveChangesAsync();
            }

            var created = new ProductVariant
            {
                FkProductId = productId,
                FkSizeId = size.PkSizeId,
                FkColorId = color.PkColorId,
                Sku = $"{productId}-{size.Label}".ToUpper(),
                StockQuantity = 50,
                ReorderLevel = 5,
                IsActive = true
            };
            _context.ProductVariants.Add(created);
            await _context.SaveChangesAsync();

            return await Variants().FirstAsync(pv => pv.PkProductVariantId == created.PkProductVariantId);
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
        /// A size that has never been bought gets its variant row created, like <see cref="ResolveVariantAsync"/> does.
        /// Colors are never invented: the product must already have a variant in that color.
        private async Task<ProductVariant?> ResolveVariantChangeAsync(ProductVariant current, string? sizeLabel, string? colorName)
        {
            IQueryable<ProductVariant> Variants() => _context.ProductVariants.Include(pv => pv.FkColor).Include(pv => pv.FkSize);

            var wantSize = string.IsNullOrWhiteSpace(sizeLabel) ? current.FkSize.Label : sizeLabel.Trim();
            var wantColor = string.IsNullOrWhiteSpace(colorName) ? current.FkColor.Name : colorName.Trim();
            var sizeLower = wantSize.ToLower();
            var colorLower = wantColor.ToLower();

            var existing = await Variants().FirstOrDefaultAsync(pv =>
                pv.FkProductId == current.FkProductId && pv.IsActive &&
                pv.FkSize.Label.ToLower() == sizeLower && pv.FkColor.Name.ToLower() == colorLower);
            if (existing != null) return existing;

            var color = await Variants()
                .Where(pv => pv.FkProductId == current.FkProductId && pv.IsActive && pv.FkColor.Name.ToLower() == colorLower)
                .Select(pv => pv.FkColor)
                .FirstOrDefaultAsync();
            if (color == null) return null;

            var size = await _context.Sizes.FirstOrDefaultAsync(s => s.Label.ToLower() == sizeLower);
            if (size == null)
            {
                var standard = new[] { "S", "M", "L", "XL" };
                var order = Array.IndexOf(standard, wantSize.ToUpper());
                if (order < 0) return null;
                size = new Size { Label = wantSize.ToUpper(), SortOrder = order + 1 };
                _context.Sizes.Add(size);
                await _context.SaveChangesAsync();
            }

            var created = new ProductVariant
            {
                FkProductId = current.FkProductId,
                FkSizeId = size.PkSizeId,
                FkColorId = color.PkColorId,
                Sku = $"{current.FkProductId}-{size.Label}-{color.Name}".ToUpper().Replace(' ', '-'),
                PriceOverride = current.PriceOverride,
                StockQuantity = 50,
                ReorderLevel = 5,
                IsActive = true
            };
            _context.ProductVariants.Add(created);
            await _context.SaveChangesAsync();

            return await Variants().FirstAsync(pv => pv.PkProductVariantId == created.PkProductVariantId);
        }

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
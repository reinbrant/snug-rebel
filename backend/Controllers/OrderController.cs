using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTO;
using backend.Models;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrderController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetOrdersByUserId(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return BadRequest(new { error = "InvalidUserId", message = "The userId parameter cannot be null or empty." });
                }

                var orders = await _context.Orders
                    .Include(o => o.OrderItems)
                    .Where(o => o.FkUserId == userId)
                    .OrderByDescending(o => o.PlacedAt)
                    .ToListAsync();

                return Ok(orders.Select(MapToOrderDto).ToList());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== GET ORDERS CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        [HttpGet("{orderId}")]
        public async Task<IActionResult> GetOrderById(string orderId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(orderId))
                {
                    return BadRequest(new { error = "InvalidOrderId", message = "The orderId parameter cannot be null or empty." });
                }

                var order = await _context.Orders
                    .Include(o => o.OrderItems)
                    .FirstOrDefaultAsync(o => o.PkOrderId == orderId);

                if (order == null)
                {
                    return NotFound(new { error = "OrderNotFound", message = $"Order with ID '{orderId}' was not found." });
                }

                return Ok(MapToOrderDto(order));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== GET ORDER BY ID CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
            }
        }

        // Changed to support accepting guest cart orders via SessionToken instead of just UserId. This allows guests to checkout without creating an account.
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (request == null) return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

                string? normalizedUserId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId.Trim();
                string? normalizedSessionToken = string.IsNullOrWhiteSpace(request.SessionToken) ? null : request.SessionToken.Trim();

                if (normalizedUserId == null && normalizedSessionToken == null)
                    return BadRequest(new { error = "InvalidIdentifier", message = "A UserId or SessionToken must be provided." });

                var cart = await _context.Carts
                    .Include(c => c.CartItems).ThenInclude(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkProduct)
                    .Include(c => c.CartItems).ThenInclude(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkSize)
                    .Include(c => c.CartItems).ThenInclude(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkColor)
                    .FirstOrDefaultAsync(c =>
                        (normalizedUserId != null && c.FkUserId == normalizedUserId) ||
                        (normalizedSessionToken != null && c.SessionToken == normalizedSessionToken));

                if (cart == null) return NotFound(new { error = "CartNotFound", message = "No active cart was found." });
                if (!cart.CartItems.Any()) return BadRequest(new { error = "EmptyCart", message = "Cannot place an order because the cart is empty." });

                // 1. Resolve Shipping Address (Create one if guest)
                string shippingAddressId = request.ShippingAddressId ?? string.Empty;
                if (string.IsNullOrEmpty(shippingAddressId))
                {
                    var newAddress = new Address
                    {
                        FkUserId = normalizedUserId, // Will be null for guests
                        RecipientName = request.RecipientName ?? "Guest",
                        Phone = request.Phone ?? "0000",
                        Line1 = request.Line1 ?? "N/A",
                        Barangay = request.Barangay ?? "N/A",
                        City = request.City ?? "N/A",
                        Province = request.Province ?? "N/A",
                        PostalCode = request.PostalCode ?? "0000",
                        Country = "PH",
                        IsDefault = true,
                        AddressType = AddressType.Shipping,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Addresses.Add(newAddress);
                    await _context.SaveChangesAsync();
                    shippingAddressId = newAddress.PkAddressId;
                }

                // 2. Resolve Promo Code
                string? promoId = null;
                if (!string.IsNullOrWhiteSpace(request.VoucherCode))
                {
                    var promo = await _context.PromoCodes.FirstOrDefaultAsync(p => p.Promocode.ToLower() == request.VoucherCode.ToLower() && p.IsActive);
                    promoId = promo?.PkPromoCodeId;
                }

                var now = DateTime.UtcNow;
                var subtotal = cart.CartItems.Sum(ci => (ci.FkProductVariant.PriceOverride ?? ci.FkProductVariant.FkProduct.BasePrice) * ci.Quantity);

                // Format: SR-YYMMDD-XXXX (e.g., SR-261013-4821)
                var orderNumber = $"SR-{now:yyMMdd}-{new Random().Next(1000, 10000)}";

                var order = new Order
                {
                    OrderNumber = orderNumber,
                    FkUserId = normalizedUserId ?? "guest", // Required by DB; use placeholder if guest
                    FkPromoCodeId = promoId,
                    FkShippingAddressId = shippingAddressId,
                    Subtotal = subtotal,
                    DiscountAmount = request.DiscountAmount,
                    ShippingFee = request.ShippingFee,
                    TotalAmount = Math.Max(0, subtotal + request.ShippingFee - request.DiscountAmount),
                    CustomerNote = request.CustomerNote,
                    Status = OrderStatus.Pending,
                    PlacedAt = now,
                    UpdatedAt = now
                };

                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    _context.Orders.Add(order);
                    await _context.SaveChangesAsync();

                    var orderItems = new List<OrderItem>();
                    foreach (var cartItem in cart.CartItems)
                    {
                        var variant = cartItem.FkProductVariant;
                        var unitPrice = variant.PriceOverride ?? variant.FkProduct.BasePrice;

                        orderItems.Add(new OrderItem
                        {
                            FkOrderId = order.PkOrderId,
                            FkProductVariantId = variant.PkProductVariantId,
                            ProductName = variant.FkProduct.ProductName,
                            Sku = variant.Sku,
                            SizeLabel = variant.FkSize.Label,
                            ColorName = variant.FkColor.Name,
                            UnitPrice = unitPrice,
                            Quantity = cartItem.Quantity,
                            LineTotal = unitPrice * cartItem.Quantity,
                            FkProductVariant = variant
                        });

                        variant.StockQuantity -= cartItem.Quantity;
                    }

                    _context.OrderItems.AddRange(orderItems);
                    _context.CartItems.RemoveRange(cart.CartItems);

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    order.OrderItems = orderItems;
                    return CreatedAtAction(nameof(GetOrderById), new { orderId = order.PkOrderId }, MapToOrderDto(order));
                }
                catch (Exception dbEx)
                {
                    await transaction.RollbackAsync();
                    throw dbEx;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== CHECKOUT CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
            }
        }

        private static OrderDTO MapToOrderDto(Order order)
        {
            return new OrderDTO
            {
                PkOrderId = order.PkOrderId,
                OrderNumber = order.OrderNumber,
                FkUserId = order.FkUserId,
                FkPromoCodeId = order.FkPromoCodeId,
                FkShippingAddressId = order.FkShippingAddressId,
                FkBillingAddressId = order.FkBillingAddressId,
                Subtotal = order.Subtotal,
                DiscountAmount = order.DiscountAmount,
                ShippingFee = order.ShippingFee,
                TotalAmount = order.TotalAmount,
                CustomerNote = order.CustomerNote,
                PlacedAt = order.PlacedAt,
                UpdatedAt = order.UpdatedAt,
                Items = order.OrderItems.Select(oi => new OrderItemDTO
                {
                    PkOrderItemId = oi.PkOrderItemId,
                    FkOrderId = oi.FkOrderId,
                    FkProductVariantId = oi.FkProductVariantId,
                    ProductName = oi.ProductName,
                    Sku = oi.Sku,
                    SizeLabel = oi.SizeLabel,
                    ColorName = oi.ColorName,
                    UnitPrice = oi.UnitPrice,
                    Quantity = oi.Quantity,
                    LineTotal = oi.LineTotal
                }).ToList()
            };
        }
    }
}
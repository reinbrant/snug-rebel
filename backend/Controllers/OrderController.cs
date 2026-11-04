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

        // Public order lookup by order number (e.g. SR-261013-4821) for the tracking page.
        // Returns a privacy-trimmed view only: no user id, street, phone or email.

        [HttpGet("track/{orderNumber}")]
        public async Task<IActionResult> TrackOrder(string orderNumber)
        {
            try
            {
                var key = (orderNumber ?? string.Empty).Trim();
                if (key.Length == 0 || key.Length > 40)
                    return NotFound(new { error = "OrderNotFound", message = "No order matches that number." });

                var upper = key.ToUpperInvariant();

                var order = await _context.Orders
                    .AsNoTracking()
                    .AsSplitQuery()
                    .Include(o => o.OrderItems)
                    .Include(o => o.Shipments)
                    .Include(o => o.OrderStatusHistories)
                    .Include(o => o.FkShippingAddress)
                    .FirstOrDefaultAsync(o => o.OrderNumber.ToUpper() == upper);

                if (order == null)
                    return NotFound(new { error = "OrderNotFound", message = "No order matches that number." });

                return Ok(MapToTrackingDto(order));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== TRACK ORDER CRASH ===\n{ex}");
                return StatusCode(500, new { error = "InternalServerError", message = "Could not look up that order right now." });
            }
        }

        // Changed to support accepting guest cart orders via SessionToken instead of just UserId. This allows guests to checkout without creating an account.
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (request == null) return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

                // Fall back to "usr-guest-user" if no user is logged in.
                string? normalizedUserId = string.IsNullOrWhiteSpace(request.UserId) ? "usr-guest-user" : request.UserId.Trim();
                if (!string.IsNullOrEmpty(normalizedUserId) && normalizedUserId.Length > 40)
                {
                    normalizedUserId = normalizedUserId.Substring(0, 40);
                }
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
                // TODO: Maybe change this later since Random() is not guaranteed to be unique.
                var orderNumber = $"SR-{now:yyMMdd}-{new Random().Next(1000, 10000)}";

                var order = new Order
                {
                    OrderNumber = orderNumber,
                    FkUserId = normalizedUserId,
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

                    // Keep the chosen courier so the tracking page can estimate arrival.
                    // Uses the existing shipments table; staff fill in the tracking number later.
                    _context.Shipments.Add(new Shipment
                    {
                        PkShipmentId = "ship-" + Guid.NewGuid().ToString("N").Substring(0, 24), // Ensures it fits in varchar(40)
                        FkOrderId = order.PkOrderId,
                        Courier = string.IsNullOrWhiteSpace(request.Courier) ? null : request.Courier.Trim(),
                        Status = ShipmentStatus.Preparing
                    });
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

        private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
        private static DateTime? AsUtc(DateTime? value) => value.HasValue ? AsUtc(value.Value) : null;

        // "N/A" / "0000" are the placeholders checkout writes for missing guest fields.
        private static string CleanText(string? value)
        {
            var v = (value ?? string.Empty).Trim();
            return v.Equals("N/A", StringComparison.OrdinalIgnoreCase) ? string.Empty : v;
        }

        // "Juan Dela Cruz" -> "Juan D."; "Juan" -> "Juan"
        private static string ShortName(string? fullName)
        {
            var parts = CleanText(fullName).Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return string.Empty;
            if (parts.Length == 1) return parts[0];
            return $"{parts[0]} {char.ToUpperInvariant(parts[^1][0])}.";
        }

        private static OrderTrackingDTO MapToTrackingDto(Order order)
        {
            // Prefer the shipment that has actually moved; otherwise any shipment row.
            var shipment = order.Shipments
                .OrderByDescending(s => s.DeliveredAt ?? s.ShippedAt ?? DateTime.MinValue)
                .FirstOrDefault();

            var events = order.OrderStatusHistories
                .OrderBy(h => h.ChangedAt)
                .Select(h => new OrderTrackingEventDTO { Status = h.Status.ToString(), At = AsUtc(h.ChangedAt) })
                .ToList();

            // Checkout doesn't write a history row, so make sure "Pending" is always there.
            if (!events.Any(e => e.Status == nameof(OrderStatus.Pending)))
                events.Insert(0, new OrderTrackingEventDTO { Status = nameof(OrderStatus.Pending), At = AsUtc(order.PlacedAt) });

            var address = order.FkShippingAddress;

            return new OrderTrackingDTO
            {
                OrderNumber = order.OrderNumber,
                Status = order.Status.ToString(),
                PlacedAt = AsUtc(order.PlacedAt),
                UpdatedAt = AsUtc(order.UpdatedAt),
                ItemCount = order.OrderItems.Sum(oi => oi.Quantity),
                Subtotal = order.Subtotal,
                DiscountAmount = order.DiscountAmount,
                ShippingFee = order.ShippingFee,
                TotalAmount = order.TotalAmount,
                Courier = string.IsNullOrWhiteSpace(shipment?.Courier) ? null : shipment!.Courier,
                TrackingNumber = string.IsNullOrWhiteSpace(shipment?.TrackingNumber) ? null : shipment!.TrackingNumber,
                ShipmentStatus = shipment?.Status.ToString(),
                ShippedAt = AsUtc(shipment?.ShippedAt),
                DeliveredAt = AsUtc(shipment?.DeliveredAt),
                ShipTo = new OrderTrackingShipToDTO
                {
                    Name = ShortName(address?.RecipientName),
                    Barangay = CleanText(address?.Barangay),
                    City = CleanText(address?.City),
                    Province = CleanText(address?.Province)
                },
                Events = events
            };
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
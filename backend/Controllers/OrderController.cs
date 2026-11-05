using Microsoft.AspNetCore.Authorization;
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

        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> GetOrders()
        {
            var orders = await _context.Orders.AsNoTracking().AsSplitQuery()
                .Include(o => o.OrderItems).Include(o => o.Shipments)
                .OrderByDescending(o => o.PlacedAt).ToListAsync();
            return Ok(orders.Select(MapToOrderDto));
        }

        [HttpPut("{orderId}/shipment")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> SaveShipment(string orderId, [FromBody] ShipmentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Courier) || string.IsNullOrWhiteSpace(request.TrackingNumber))
                return BadRequest(new { message = "Courier and tracking number are required." });
            var order = await _context.Orders.Include(o => o.Shipments).FirstOrDefaultAsync(o => o.PkOrderId == orderId);
            if (order == null) return NotFound();
            if (order.Status is OrderStatus.Delivered or OrderStatus.Cancelled or OrderStatus.Refunded)
                return Conflict(new { message = "This order cannot be shipped in its current status." });
            var shipment = order.Shipments.OrderByDescending(s => s.ShippedAt).FirstOrDefault();
            if (shipment == null) { shipment = new Shipment { FkOrderId = orderId }; _context.Shipments.Add(shipment); }
            shipment.Courier = request.Courier.Trim(); shipment.TrackingNumber = request.TrackingNumber.Trim();
            shipment.Status = ShipmentStatus.InTransit; shipment.ShippedAt ??= DateTime.UtcNow;
            if (order.Status != OrderStatus.Shipped)
                _context.OrderStatusHistories.Add(new OrderStatusHistory
                {
                    FkOrderId = orderId, Status = OrderStatus.Shipped, ChangedAt = DateTime.UtcNow,
                    ChangedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    Note = "Shipment created by staff."
                });
            order.Status = OrderStatus.Shipped; order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
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

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (request == null) return BadRequest(new { error = "NullRequestBody", message = "Request body cannot be null." });

                // 1. Idempotency Check
                if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
                {
                    var existingOrder = await _context.Orders
                        .Include(o => o.OrderItems)
                        .FirstOrDefaultAsync(o => o.IdempotencyKey == request.IdempotencyKey.Trim());
                    if (existingOrder != null)
                    {
                        return Ok(MapToOrderDto(existingOrder));
                    }
                }

                // 2. Proper nullable guest handling
                string? authenticatedUserId = string.IsNullOrWhiteSpace(request.UserId) ? null : request.UserId.Trim();
                string? normalizedSessionToken = string.IsNullOrWhiteSpace(request.SessionToken) ? null : request.SessionToken.Trim();

                if (authenticatedUserId == null && normalizedSessionToken == null)
                    return BadRequest(new { error = "InvalidIdentifier", message = "A UserId or SessionToken must be provided." });

                var directCheckout = request.DirectItems is { Count: > 0 };
                Cart? cart;
                if (directCheckout)
                {
                    cart = new Cart();
                    foreach (var item in request.DirectItems!)
                    {
                        if (item.Quantity <= 0) return BadRequest(new { message = "Quantity must be positive." });
                        var query = _context.ProductVariants.Include(v => v.FkProduct).Include(v => v.FkSize).Include(v => v.FkColor)
                            .Where(v => v.FkProductId == item.ProductId && v.IsActive && v.FkProduct.IsActive);
                        if (!string.IsNullOrWhiteSpace(item.ProductVariantId)) query = query.Where(v => v.PkProductVariantId == item.ProductVariantId);
                        if (!string.IsNullOrWhiteSpace(item.Size)) query = query.Where(v => v.FkSize.Label == item.Size);
                        if (!string.IsNullOrWhiteSpace(item.Color)) query = query.Where(v => v.FkColor.Name == item.Color);
                        var variant = await query.OrderBy(v => v.PkProductVariantId).FirstOrDefaultAsync();
                        if (variant == null) return BadRequest(new { message = "The selected product options are unavailable." });
                        cart.CartItems.Add(new CartItem { FkProductVariant = variant, Quantity = item.Quantity });
                    }
                }
                else
                {
                    cart = await _context.Carts
                        .Include(c => c.CartItems).ThenInclude(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkProduct)
                        .Include(c => c.CartItems).ThenInclude(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkSize)
                        .Include(c => c.CartItems).ThenInclude(ci => ci.FkProductVariant).ThenInclude(pv => pv.FkColor)
                        .FirstOrDefaultAsync(c => (authenticatedUserId != null && c.FkUserId == authenticatedUserId) ||
                            (normalizedSessionToken != null && c.SessionToken == normalizedSessionToken));
                }
                if (cart == null) return NotFound(new { error = "CartNotFound", message = "No active cart was found." });
                if (!cart.CartItems.Any()) return BadRequest(new { error = "EmptyCart", message = "Cannot place an order because the cart is empty." });
                if (cart.CartItems.Any(i => !i.FkProductVariant.IsActive || !i.FkProductVariant.FkProduct.IsActive))
                    return Conflict(new { message = "An item in this order is no longer available." });

                // 3. Satisfy ck_orders_owner (_fk_user_id IS NOT NULL OR contact_email IS NOT NULL)
                string? contactEmail = !string.IsNullOrWhiteSpace(request.Email)
                    ? request.Email.Trim()
                    : (authenticatedUserId == null ? "guest@snugrebel.local" : null);

                // 4. Server-Side Courier Lookup
                var courierQuery = request.Courier?.Trim().ToLower() ?? "jnt";
                var courier = await _context.Couriers
                    .FirstOrDefaultAsync(c => c.Code.ToLower() == courierQuery || c.Name.ToLower().Contains(courierQuery))
                    ?? await _context.Couriers.FirstOrDefaultAsync(c => c.Code == "jnt")
                    ?? new Courier { Code = "jnt", Name = "J&T Express", Fee = 120m };

                decimal shippingFee = courier.Fee;

                // 5. Resolve Shipping Address
                string shippingAddressId = request.ShippingAddressId ?? string.Empty;
                if (string.IsNullOrEmpty(shippingAddressId))
                {
                    var newAddress = new Address
                    {
                        FkUserId = authenticatedUserId, // This will be null for guest users.
                        RecipientName = request.RecipientName ?? "Guest",
                        Phone = request.Phone ?? "0000",
                        Line1 = request.Line1 ?? "N/A",
                        Barangay = request.Barangay ?? "N/A",
                        City = request.City ?? "N/A",
                        Province = request.Province ?? "N/A",
                        PostalCode = request.PostalCode ?? "0000",
                        Country = "PH",
                        IsDefault = authenticatedUserId != null,
                        AddressType = AddressType.Shipping,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Addresses.Add(newAddress);
                    await _context.SaveChangesAsync();
                    shippingAddressId = newAddress.PkAddressId;
                }

                // 6. Resolve & Validate Promo Code
                string? promoId = null;
                decimal discountAmount = 0m;
                if (!string.IsNullOrWhiteSpace(request.VoucherCode))
                {
                    var code = request.VoucherCode.Trim();
                    var promo = await _context.PromoCodes
                        .FirstOrDefaultAsync(p => p.Promocode.ToUpper() == code.ToUpper() && p.IsActive);

                    if (promo != null)
                    {
                        var subtotalCheck = cart.CartItems.Sum(ci => (ci.FkProductVariant.PriceOverride ?? ci.FkProductVariant.FkProduct.BasePrice) * ci.Quantity);
                        var isValidWindow = (promo.PromoStart == null || DateTime.UtcNow >= promo.PromoStart) &&
                                            (promo.PromoEnd == null || DateTime.UtcNow <= promo.PromoEnd);
                        var isValidMinOrder = subtotalCheck >= (promo.MinOrderAmount ?? 0m);
                        var isValidUses = promo.MaxUses == null || promo.TimesUsed < promo.MaxUses;

                        if (isValidWindow && isValidMinOrder && isValidUses)
                        {
                            promoId = promo.PkPromoCodeId;
                            if (promo.DiscountType == 0) // Percentage
                            {
                                discountAmount = Math.Round(subtotalCheck * (promo.DiscountValue / 100m), 2);
                                if (promo.MaxDiscountAmount.HasValue && discountAmount > promo.MaxDiscountAmount.Value)
                                {
                                    discountAmount = promo.MaxDiscountAmount.Value;
                                }
                            }
                            else // Fixed amount
                            {
                                discountAmount = promo.DiscountValue;
                            }
                        }
                    }
                }

                var now = DateTime.UtcNow;
                var subtotal = cart.CartItems.Sum(ci => (ci.FkProductVariant.PriceOverride ?? ci.FkProductVariant.FkProduct.BasePrice) * ci.Quantity);
                decimal finalTotal = Math.Max(0, subtotal + shippingFee - discountAmount);

                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // 7. Collision-Free Order Number via Sequence
                    var seqVal = await _context.Database
                        .SqlQueryRaw<long>("SELECT nextval('order_number_seq') AS \"Value\"")
                        .SingleAsync();
                    var orderNumber = $"SR-{now:yyMMdd}-{seqVal}";

                    var order = new Order
                    {
                        OrderNumber = orderNumber,
                        FkUserId = authenticatedUserId,
                        ContactEmail = contactEmail,
                        ContactPhone = request.Phone?.Trim(),
                        CashReadyOption = request.CashReadyOption?.Trim(),
                        FkPromoCodeId = promoId,
                        FkShippingAddressId = shippingAddressId,
                        Subtotal = subtotal,
                        DiscountAmount = discountAmount,
                        ShippingFee = shippingFee,
                        TotalAmount = finalTotal,
                        CustomerNote = request.CustomerNote,
                        Status = OrderStatus.Pending,
                        IdempotencyKey = request.IdempotencyKey?.Trim(),
                        PlacedAt = now,
                        UpdatedAt = now
                    };

                    _context.Orders.Add(order);
                    await _context.SaveChangesAsync();

                    var orderItems = new List<OrderItem>();
                    foreach (var cartItem in cart.CartItems)
                    {
                        var variant = cartItem.FkProductVariant;
                        var unitPrice = variant.PriceOverride ?? variant.FkProduct.BasePrice;

                        // Atomic Stock Decrement via ExecuteUpdateAsync
                        var affected = await _context.ProductVariants
                            .Where(pv => pv.PkProductVariantId == variant.PkProductVariantId && pv.IsActive && pv.FkProduct.IsActive && pv.StockQuantity >= cartItem.Quantity)
                            .ExecuteUpdateAsync(s => s.SetProperty(pv => pv.StockQuantity, pv => pv.StockQuantity - cartItem.Quantity));

                        if (affected == 0)
                        {
                            await transaction.RollbackAsync();
                            return Conflict(new { error = "InsufficientStock", message = $"Insufficient stock for {variant.Sku}." });
                        }

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
                    }

                    _context.OrderItems.AddRange(orderItems);

                    // 8. Atomic Promo Validation & Increment
                    if (!string.IsNullOrEmpty(promoId))
                    {
                        await _context.PromoCodes
                            .Where(p => p.PkPromoCodeId == promoId && (p.MaxUses == null || p.TimesUsed < p.MaxUses))
                            .ExecuteUpdateAsync(s => s.SetProperty(p => p.TimesUsed, p => p.TimesUsed + 1));
                    }

                    // 9. Shipment Record with Courier relation
                    _context.Shipments.Add(new Shipment
                    {
                        FkOrderId = order.PkOrderId,
                        FkCourierId = courier.PkCourierId != null && !courier.PkCourierId.StartsWith("cour") ? courier.PkCourierId : null,
                        Courier = courier.Name,
                        Status = ShipmentStatus.Preparing
                    });

                    // 10. Initial Pending Payment Record
                    PaymentMethod parsedMethod = PaymentMethod.Cod;
                    if (!string.IsNullOrWhiteSpace(request.PaymentMethod))
                    {
                        Enum.TryParse(request.PaymentMethod.Trim(), true, out parsedMethod);
                    }

                    _context.Payments.Add(new Payment
                    {
                        FkOrderId = order.PkOrderId,
                        Method = parsedMethod,
                        Status = PaymentStatus.Pending,
                        Amount = finalTotal,
                        CreatedAt = now
                    });

                    // 11. Initial Pending OrderStatusHistory Record
                    _context.OrderStatusHistories.Add(new OrderStatusHistory
                    {
                        FkOrderId = order.PkOrderId,
                        Status = OrderStatus.Pending,
                        ChangedBy = authenticatedUserId,
                        Note = "Order placed.",
                        ChangedAt = now
                    });

                    if (!directCheckout) _context.CartItems.RemoveRange(cart.CartItems);

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
                Status = order.Status.ToString(),
                Courier = order.Shipments.FirstOrDefault()?.Courier,
                ContactEmail = order.ContactEmail,
                CashReadyOption = order.CashReadyOption,
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

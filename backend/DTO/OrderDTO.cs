using System;
using System.Collections.Generic;

namespace backend.DTO
{
    public class DirectOrderItemRequest
    {
        public string? ProductVariantId { get; set; }
        public string ProductId { get; set; } = string.Empty;
        public string? Size { get; set; }
        public string? Color { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class CreateOrderRequest
    {
        public string? UserId { get; set; }
        public string? SessionToken { get; set; }
        public string? ShippingAddressId { get; set; }
        public string? VoucherCode { get; set; }
        public string? Courier { get; set; }          // Accepts courier code ('jnt', 'lbc') or name
        public string? PaymentMethod { get; set; }    // 'COD', 'COD_EWALLET', 'GCASH', etc.
        public string? CashReadyOption { get; set; }
        public string? CustomerNote { get; set; }
        public string? IdempotencyKey { get; set; }

        // Legacy fields kept optional so frontend doesn't break
        public decimal ShippingFee { get; set; }
        public decimal DiscountAmount { get; set; }

        // Guest / inline address & contact fields
        public string? RecipientName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Line1 { get; set; }
        public string? Barangay { get; set; }
        public string? City { get; set; }
        public string? Province { get; set; }
        public string? PostalCode { get; set; }

        public List<DirectOrderItemRequest>? DirectItems { get; set; }
    }

    public class OrderDTO
    {
        public string PkOrderId { get; set; } = null!;
        public string OrderNumber { get; set; } = null!;
        public string? FkUserId { get; set; }
        public string? FkPromoCodeId { get; set; }
        public string FkShippingAddressId { get; set; } = null!;
        public string? FkBillingAddressId { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal TotalAmount { get; set; }
        public string? CustomerNote { get; set; }

        public string Status { get; set; } = "Pending";
        public string? Courier { get; set; }
        public string? ContactEmail { get; set; }
        public string? CashReadyOption { get; set; }

        public DateTime PlacedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<OrderItemDTO> Items { get; set; } = new List<OrderItemDTO>();
    }

    public class OrderItemDTO
    {
        public string ProductId { get; set; } = string.Empty;
        public string PkOrderItemId { get; set; } = null!;
        public string FkOrderId { get; set; } = null!;
        public string FkProductVariantId { get; set; } = null!;
        public string ProductName { get; set; } = null!;
        public string Sku { get; set; } = null!;
        public string SizeLabel { get; set; } = null!;
        public string ColorName { get; set; } = null!;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal LineTotal { get; set; }
    }

    public record UpdateOrderStatusRequest(string Status);
}

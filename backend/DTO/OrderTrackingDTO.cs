using System;
using System.Collections.Generic;

namespace backend.DTO
{
    // Privacy-trimmed order view for the public tracking page. Statuses are strings, not enum numbers.
    public class OrderTrackingDTO
    {
        public string OrderNumber { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";          // OrderStatus name
        public DateTime PlacedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int ItemCount { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal TotalAmount { get; set; }
        public string? Courier { get; set; }
        public string? TrackingNumber { get; set; }
        public string? ShipmentStatus { get; set; }              // Preparing | InTransit | Delivered | Returned
        public DateTime? ShippedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public OrderTrackingShipToDTO ShipTo { get; set; } = new();
        public List<OrderTrackingEventDTO> Events { get; set; } = new();
        public List<OrderTrackingItemDTO> Items { get; set; } = new();
    }

    public class OrderTrackingItemDTO
    {
        public string OrderItemId { get; set; } = string.Empty;
        public string ProductId { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string SizeLabel { get; set; } = string.Empty;
        public string ColorName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class OrderTrackingShipToDTO
    {
        public string Name { get; set; } = string.Empty;
        public string Barangay { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Province { get; set; } = string.Empty;
    }

    public class OrderTrackingEventDTO
    {
        public string Status { get; set; } = string.Empty;
        public DateTime At { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models;

public partial class Order
{
    public string PkOrderId { get; set; } = null!;

    public string OrderNumber { get; set; } = null!;

    public string? FkUserId { get; set; }

    public string? FkPromoCodeId { get; set; }

    public string FkShippingAddressId { get; set; } = null!;

    public string? FkBillingAddressId { get; set; }

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

    public string? CashReadyOption { get; set; }

    public decimal ShippingDiscount { get; set; }

    public string? IdempotencyKey { get; set; }

    public bool IsTest { get; set; }
    
    public uint Version { get; set; }

    public decimal Subtotal { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal ShippingFee { get; set; }

    public decimal TotalAmount { get; set; }

    public string? CustomerNote { get; set; }

    public DateTime PlacedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [JsonIgnore]
    public virtual Address? FkBillingAddress { get; set; }

    [JsonIgnore]
    public virtual PromoCode? FkPromoCode { get; set; }

    [JsonIgnore]
    public virtual Address FkShippingAddress { get; set; } = null!;

    [JsonIgnore]
    public virtual User? FkUser { get; set; }

    [JsonIgnore]
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    [JsonIgnore]
    public virtual ICollection<OrderStatusHistory> OrderStatusHistories { get; set; } = new List<OrderStatusHistory>();

    [JsonIgnore]
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    [JsonIgnore]
    public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
}

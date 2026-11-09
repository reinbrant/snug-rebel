using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public partial class User {
    [Column("role")] public UserRole Role { get; set; }
    [Column("email_verification_required")] public bool EmailVerificationRequired { get; set; }
}
public partial class PromoCode { [Column("discount_type")] public DiscountType DiscountType { get; set; } }
public partial class Address { [Column("address_type")] public AddressType AddressType { get; set; } }
public partial class Order { [Column("status")] public OrderStatus Status { get; set; } }
public partial class Payment { 
    [Column("method")] public PaymentMethod Method { get; set; } 
    [Column("status")] public PaymentStatus Status { get; set; } 
}
public partial class OrderStatusHistory { [Column("status")] public OrderStatus Status { get; set; } }
public partial class Shipment { [Column("status")] public ShipmentStatus Status { get; set; } }

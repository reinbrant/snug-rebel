using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models;

public partial class Address
{
    public string PkAddressId { get; set; } = null!;

    public string? FkUserId { get; set; }

    public string RecipientName { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string Line1 { get; set; } = null!;

    public string? Line2 { get; set; }

    public string Barangay { get; set; } = null!;

    public string City { get; set; } = null!;

    public string Province { get; set; } = null!;

    public string PostalCode { get; set; } = null!;

    public string Country { get; set; } = null!;

    public bool IsDefault { get; set; }
    
    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
    
    public DateTime? ArchivedAt { get; set; }
    
    [JsonIgnore]
    public virtual User? FkUser { get; set; }

    [JsonIgnore]
    public virtual ICollection<Order> OrderFkBillingAddresses { get; set; } = new List<Order>();

    [JsonIgnore]
    public virtual ICollection<Order> OrderFkShippingAddresses { get; set; } = new List<Order>();
}

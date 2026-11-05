using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models;

public partial class Shipment
{
    public string PkShipmentId { get; set; } = null!;

    public string FkOrderId { get; set; } = null!;

    public string? FkCourierId { get; set; }
    
    public string? Courier { get; set; }

    public string? TrackingNumber { get; set; }

    public DateTime? ShippedAt { get; set; }

    public DateTime? DeliveredAt { get; set; }

    [JsonIgnore]
    public virtual Order FkOrder { get; set; } = null!;

    [JsonIgnore]
    public virtual Courier? FkCourier { get; set; }
}

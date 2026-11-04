using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models;

public partial class OrderStatusHistory
{
    public string PkOrderStatusHistoryId { get; set; } = null!;

    public string FkOrderId { get; set; } = null!;

    public string? ChangedBy { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime ChangedAt { get; set; }

    [JsonIgnore]
    public virtual User? ChangedByNavigation { get; set; }

    [JsonIgnore]
    public virtual Order FkOrder { get; set; } = null!;
}

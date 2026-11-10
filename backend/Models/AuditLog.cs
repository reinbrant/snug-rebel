using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace backend.Models;

public partial class AuditLog
{
    public string PkAuditLogId { get; set; } = null!;

    public string? FkUserId { get; set; } = null!;

    public string Action { get; set; } = null!;

    public string ActionType { get; set; } = "Legacy";
    public string Description { get; set; } = "";
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string ActorName { get; set; } = "Unknown";
    public string ActorRole { get; set; } = "Unknown";
    public string? Changes { get; set; }
    public string? RequestId { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public virtual User? FkUser { get; set; } = null!;
}

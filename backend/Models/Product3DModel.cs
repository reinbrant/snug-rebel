using System;
using System.Text.Json.Serialization;

namespace backend.Models;

public partial class Product3DModel
{
    public string PkProduct3DModelId { get; set; } = null!;

    public string FkProductId { get; set; } = null!;

    public string ModelUrl { get; set; } = null!;

    public string? PreviewImageUrl { get; set; }

    public string? ModelName { get; set; }

    public long FileSizeBytes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    [JsonIgnore]
    public virtual Product FkProduct { get; set; } = null!;
}

using System.ComponentModel.DataAnnotations;

namespace backend.DTO;

public class SaveProductRequest
{
    [MaxLength(20)] public string? DisplayId { get; set; }
    [MaxLength(255)] public string? Slug { get; set; }
    [Required, MaxLength(255)] public string ProductName { get; set; } = "";
    [Required] public string FkCategoryId { get; set; } = "";
    public string? Description { get; set; }
    [Range(0, 99999999)] public decimal BasePrice { get; set; }
    [MaxLength(150)] public string? Material { get; set; }
    public bool IsActive { get; set; } = true;
    public bool HasSizes { get; set; } = true;
    public bool HasColors { get; set; } = true;
    // Omitted image/inventory lists preserve existing rows for older API clients.
    public List<SaveVariantRequest>? Variants { get; set; }
    public List<SaveImageRequest>? Images { get; set; }
}

public class SaveVariantRequest
{
    public string? Id { get; set; }
    public long? SizeId { get; set; }
    public long? ColorId { get; set; }
    [Required, MaxLength(64)] public string Sku { get; set; } = "";
    [Range(0, int.MaxValue)] public int Stock { get; set; }
    [Range(0, 99999999)] public decimal? PriceOverride { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SaveImageRequest
{
    [Required, MaxLength(500)] public string Url { get; set; } = "";
    [MaxLength(255)] public string? AltText { get; set; }
}

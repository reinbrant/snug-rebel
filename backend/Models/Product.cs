using System;
using System.Collections.Generic;
using System.Text.Json.Serialization; // 1. Add this namespace

namespace backend.Models;

public partial class Product
{
    public string PkProductId { get; set; } = null!;
    public string? DisplayId { get; set; }
    public string Slug { get; set; } = null!;
    public string ProductName { get; set; } = null!;
    public string FkCategoryId { get; set; } = null!;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public decimal AvgRating { get; set; }
    public int ReviewCount { get; set; }
    public int SoldCount { get; set; }
    public string? Material { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    [JsonIgnore]
    public virtual Category FkCategory { get; set; } = null!;

    [JsonIgnore]
    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    [JsonIgnore]
    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();

    [JsonIgnore]
    public virtual ICollection<Product3DModel> Product3DModels { get; set; } = new List<Product3DModel>();

    [JsonIgnore]
    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();
}
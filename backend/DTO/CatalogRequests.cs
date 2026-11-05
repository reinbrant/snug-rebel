using System.ComponentModel.DataAnnotations;

namespace backend.DTO;

public class CategoryRequest
{
    [Required, MaxLength(100)] public string CategoryName { get; set; } = "";
    [MaxLength(120)] public string? Slug { get; set; }
    public string? Description { get; set; }
    public string? FkParentCategoryId { get; set; }
    public bool IsActive { get; set; } = true;
}

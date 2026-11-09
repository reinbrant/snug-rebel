namespace backend.DTO;

public class ProductListDTO
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ImageSrc { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public decimal? SalePrice { get; init; }
    public double Rating { get; init; } = 5.0;
    public int ReviewCount { get; init; } = 0;
    public int SoldCount { get; init; } = 0;
    public int? StockLeft { get; init; }
    public string? Badge { get; init; }
    public List<string> Categories { get; init; } = new();

    public string? DefaultVariantId { get; init; }
}

public class ProductDetailDTO
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string ImageSrc { get; init; } = string.Empty;
    public string? ModelUrl { get; init; }
    public decimal Price { get; init; }
    public decimal? SalePrice { get; init; }
    public double Rating { get; init; } = 5.0;
    public int ReviewCount { get; init; } = 0;
    public int SoldCount { get; init; } = 0;
    public int Stock { get; init; } = 0;
    public List<ColorDTO> Colors { get; init; } = new();
    public List<SizeDTO> Sizes { get; init; } = new();

    public List<VariantDTO> Variants { get; init; } = new();
}

public record ColorDTO(string Name, string Hex);
public record SizeDTO(string Label, bool Available);
public record VariantDTO(string Id, string Color, string Size, int Stock, decimal? PriceOverride);

public record CreateProductRequest(
    string DisplayId,
    string Slug,
    string ProductName,
    string FkCategoryId,
    string? Description,
    decimal BasePrice,
    string? Material,
    bool IsActive
);
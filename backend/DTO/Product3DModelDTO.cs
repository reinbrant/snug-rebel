namespace backend.DTO;

public class Upload3DModelRequest
{
    public string ProductId { get; set; } = null!;
    public string? ModelName { get; set; }
}

public class Product3DModelDTO
{
    public string Id { get; set; } = null!;
    public string ProductId { get; set; } = null!;
    public string ModelUrl { get; set; } = null!;
    public string? PreviewImageUrl { get; set; }
    public string? ModelName { get; set; }
    public long FileSizeBytes { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateProduct3DModelRequest
{
    public string ProductId { get; set; } = null!;
    public string ModelUrl { get; set; } = null!;
    public string? PreviewImageUrl { get; set; }
    public string? ModelName { get; set; }
    public long FileSizeBytes { get; set; }
}

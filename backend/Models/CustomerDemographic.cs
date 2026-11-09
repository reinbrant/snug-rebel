namespace backend.Models;

// A row exists only while the customer agrees to share these optional answers.
public class CustomerDemographic
{
    public string UserId { get; set; } = null!;
    public string? AgeRange { get; set; }
    public string? Gender { get; set; }
    public DateTime UpdatedAt { get; set; }
}

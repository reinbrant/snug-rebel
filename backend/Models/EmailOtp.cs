namespace backend.Models;

public class EmailOtp
{
    public string UserId { get; set; } = null!;
    public string Purpose { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string CodeHash { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime SentAt { get; set; }
    public int Attempts { get; set; }
}

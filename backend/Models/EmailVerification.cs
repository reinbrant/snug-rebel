namespace backend.Models;

public class EmailVerification
{
    public string UserId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string TokenHash { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime SentAt { get; set; }
}

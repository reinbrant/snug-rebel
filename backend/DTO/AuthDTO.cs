using System.ComponentModel.DataAnnotations;
using System.Text;

namespace backend.DTO;

public class RegisterRequest : IValidatableObject
{
    private string _email = "";
    [Required, EmailAddress, MaxLength(255)] public string Email { get => _email; set => _email = value?.Trim() ?? ""; }
    [Required, MinLength(8)] public string Password { get; set; } = "";
    [Required, MaxLength(100)] public string FirstName { get; set; } = "";
    [Required, MaxLength(100)] public string LastName { get; set; } = "";
    [MaxLength(100)] public string? PhoneNumber { get; set; }
    [MaxLength(100)] public string? SessionToken { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Encoding.UTF8.GetByteCount(Password ?? "") > 72)
            yield return new ValidationResult("Password must be at most 72 UTF-8 bytes.", [nameof(Password)]);
    }
}

public class LoginRequest
{
    private string _email = "";
    [Required, EmailAddress, MaxLength(255)] public string Email { get => _email; set => _email = value?.Trim() ?? ""; }
    [Required] public string Password { get; set; } = "";
    [MaxLength(100)] public string? SessionToken { get; set; }
}

public record AuthUserDTO(string PkUserId, string UserEmail, string FirstName,
    string LastName, string PhoneNumber, string Role, bool IsActive, bool EmailVerified);

public class ResendVerificationRequest
{
    [Required, EmailAddress, MaxLength(255)] public string Email { get; set; } = "";
}

public class VerifyEmailRequest
{
    [Required, StringLength(43, MinimumLength = 43), RegularExpression("^[A-Za-z0-9_-]+$")]
    public string Token { get; set; } = "";
}

public class VerifyEmailCodeRequest : ResendVerificationRequest
{
    [Required, RegularExpression("^[0-9]{6}$")]
    public string Code { get; set; } = "";
}

public class OtpLoginRequest : VerifyEmailCodeRequest
{
    [MaxLength(100)] public string? SessionToken { get; set; }
}

public class ResetPasswordRequest : VerifyEmailCodeRequest, IValidatableObject
{
    [Required, MinLength(8)] public string Password { get; set; } = "";

    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Encoding.UTF8.GetByteCount(Password ?? "") > 72)
            yield return new ValidationResult("Password must be at most 72 UTF-8 bytes.", [nameof(Password)]);
    }
}

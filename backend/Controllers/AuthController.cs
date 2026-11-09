using backend.Data;
using backend.DTO;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Security.Claims;
using System.Text;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController(AppDbContext context, CustomerCartService carts, EmailVerificationService verification,
    EmailOtpService otp, VerificationEmailSender sender, ILogger<AuthController> logger) : ControllerBase
{
    private static AuthUserDTO Profile(User user) => new(user.PkUserId, user.UserEmail, user.FirstName,
        user.LastName, user.PhoneNumber, user.Role.ToString(), user.IsActive, user.EmailVerifiedAt != null);

    private Task SignIn(User user) => HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.PkUserId),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        }, CookieAuthenticationDefaults.AuthenticationScheme)));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("session")]
    public async Task<IActionResult> Session()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = id == null ? null : await context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.PkUserId == id);
        if (user == null || !user.IsActive || (user.EmailVerificationRequired && user.EmailVerifiedAt == null))
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }
        return Ok(Profile(user));
    }

    [HttpPost("register")]
    [EnableRateLimiting("verification-send")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        if (!verification.IsConfigured)
            return StatusCode(503, new { message = "Account verification is temporarily unavailable. Please try again later." });
        var email = request.Email.Trim().ToLowerInvariant();
        if (await context.Users.AnyAsync(u => u.UserEmail.ToLower() == email))
            return Conflict(new { error = "EmailInUse", message = "This email is already registered. Sign in to your account." });
        await using var transaction = await context.Database.BeginTransactionAsync();
        try
        {
            var user = new User
            {
                UserEmail = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName.Trim(), LastName = request.LastName.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim() ?? "", Role = UserRole.Customer,
                IsActive = true, EmailVerificationRequired = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            await verification.Send(user, cancellationToken);
            await transaction.CommitAsync();
            return Accepted(new { verificationRequired = true, email = user.UserEmail,
                message = "Check your email to verify your account before signing in." });
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { error = "EmailInUse", message = "This email is already registered." });
        }
        catch (EmailDeliveryException)
        {
            return StatusCode(503, new { message = "We couldn't send your verification email. Please try creating your account again." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Customer registration failed");
            return StatusCode(500, new { message = "Unable to create your account. Please try again." });
        }
    }

    [HttpPost("resend-verification")]
    [EnableRateLimiting("verification-send")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, CancellationToken cancellationToken)
    {
        if (!verification.IsConfigured)
            return StatusCode(503, new { message = "Account verification is temporarily unavailable. Please try again later." });
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.UserEmail.ToLower() == email
            && u.IsActive && u.EmailVerificationRequired && u.EmailVerifiedAt == null, cancellationToken);
        if (user != null)
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                await verification.Send(user, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch (EmailDeliveryException)
            {
                // Keep the same public response for unknown addresses, cooldowns,
                // and provider failures. Rollback preserves the previous link.
            }
        }
        return Accepted(new { message = "If this address has an account awaiting verification, an email with a code and link will be sent. Please allow a minute between requests." });
    }

    [HttpPost("verify-email-code")]
    [EnableRateLimiting("verification-confirm")]
    public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyEmailCodeRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var user = await otp.Consume(request.Email.Trim().ToLowerInvariant(), request.Code, EmailOtpService.Verification, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        if (user == null) return InvalidCode();
        return Ok(new { message = "Email verified. You can now sign in." });
    }

    [HttpPost("request-login-code")]
    [EnableRateLimiting("verification-send")]
    public async Task<IActionResult> RequestLoginCode([FromBody] ResendVerificationRequest request, CancellationToken cancellationToken)
    {
        if (!sender.IsConfigured)
            return StatusCode(503, new { message = "Email sign-in is temporarily unavailable. Please try again later." });
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.SingleOrDefaultAsync(u => u.UserEmail.ToLower() == email
            && u.IsActive && u.Role == UserRole.Customer, cancellationToken);
        if (user != null)
        {
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var code = await otp.Issue(user, EmailOtpService.SignIn, cancellationToken);
                if (code != null) await sender.SendSignIn(user.UserEmail, code, cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch (EmailDeliveryException) { /* Roll back; preserve the last delivered code. */ }
        }
        return Accepted(new { message = "If this address belongs to an active customer account, a sign-in code will be sent. Check your spam folder too. Please allow a minute between requests." });
    }

    [HttpPost("login-code")]
    [EnableRateLimiting("verification-confirm")]
    public async Task<IActionResult> LoginCode([FromBody] OtpLoginRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var user = await otp.Consume(request.Email.Trim().ToLowerInvariant(), request.Code, EmailOtpService.SignIn, cancellationToken);
        if (user == null)
        {
            await transaction.CommitAsync(cancellationToken);
            return InvalidCode();
        }
        await carts.MergeGuestCart(user.PkUserId, request.SessionToken);
        context.AuditLogs.Add(new AuditLog { FkUserId = user.PkUserId, Action = "LOGIN", CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await SignIn(user);
        return Ok(Profile(user));
    }

    private BadRequestObjectResult InvalidCode() => BadRequest(new { error = "InvalidCode",
        message = "This code is invalid, expired, or has reached its attempt limit. Request a new code and try again." });

    [HttpPost("verify-email")]
    [EnableRateLimiting("verification-confirm")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken cancellationToken)
    {
        if (!await verification.Verify(request.Token, cancellationToken))
            return BadRequest(new { error = "InvalidVerificationToken", message = "This verification link is invalid or expired. Request a new email below." });
        return Ok(new { message = "Email verified. You can now sign in." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.UserEmail.ToLower() == email);
        var valid = false;
        if (user != null && Encoding.UTF8.GetByteCount(request.Password) <= 72)
        {
            try { valid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash); }
            catch (BCrypt.Net.SaltParseException) { /* Legacy/unusable password hashes cannot authenticate. */ }
        }
        if (!valid || user == null)
            return Unauthorized(new { error = "InvalidCredentials", message = "Invalid email or password." });
        if (!user.IsActive) return StatusCode(403, new { message = "This account is inactive." });
        if (user.EmailVerificationRequired && user.EmailVerifiedAt == null)
            return StatusCode(403, new { error = "EmailNotVerified", message = "Verify your email address before signing in." });

        await using var transaction = await context.Database.BeginTransactionAsync();
        await carts.MergeGuestCart(user.PkUserId, request.SessionToken);
        context.AuditLogs.Add(new AuditLog { FkUserId = user.PkUserId, Action = "LOGIN", CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();
        await transaction.CommitAsync();
        await SignIn(user);
        return Ok(Profile(user));
    }
}

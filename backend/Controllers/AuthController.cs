using backend.Data;
using backend.DTO;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Security.Claims;
using System.Text;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController(AppDbContext context, CustomerCartService carts, ILogger<AuthController> logger) : ControllerBase
{
    private static AuthUserDTO Profile(User user) => new(user.PkUserId, user.UserEmail, user.FirstName,
        user.LastName, user.PhoneNumber, user.Role.ToString(), user.IsActive);

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
        if (user == null || !user.IsActive)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }
        return Ok(Profile(user));
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
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
                IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            await carts.MergeGuestCart(user.PkUserId, request.SessionToken);
            await context.SaveChangesAsync();
            await transaction.CommitAsync();
            await SignIn(user);
            return Ok(Profile(user));
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { error = "EmailInUse", message = "This email is already registered." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Customer registration failed");
            return StatusCode(500, new { message = "Unable to create your account. Please try again." });
        }
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

        await using var transaction = await context.Database.BeginTransactionAsync();
        await carts.MergeGuestCart(user.PkUserId, request.SessionToken);
        context.AuditLogs.Add(new AuditLog { FkUserId = user.PkUserId, Action = "LOGIN", CreatedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();
        await transaction.CommitAsync();
        await SignIn(user);
        return Ok(Profile(user));
    }
}

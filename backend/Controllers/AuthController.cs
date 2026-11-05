using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTO;
using backend.Models;
using BCrypt.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

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
        var user = id == null ? null : await _context.Users.FindAsync(id);
        if (user == null || !user.IsActive) return Unauthorized();
        return Ok(new { user.PkUserId, user.UserEmail, user.FirstName, user.LastName,
            user.PhoneNumber, role = user.Role.ToString(), user.IsActive });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "InvalidData", message = "Email and password are required." });

            var emailExists = await _context.Users.AnyAsync(u => u.UserEmail.ToLower() == request.Email.ToLower());
            if (emailExists) return Conflict(new { error = "EmailInUse", message = "This email is already registered." });

            var user = new User
            {
                UserEmail = request.Email.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName,
                LastName = request.LastName,
                PhoneNumber = request.PhoneNumber,
                Role = UserRole.Customer, // Defaults to customer enum
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Strip password hash before returning
            user.PasswordHash = null!; 
            return Ok(user);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== REGISTER CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserEmail.ToLower() == request.Email.ToLower());
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { error = "InvalidCredentials", message = "Invalid email or password." });
            }

            if (!user.IsActive) return StatusCode(403, new { message = "This account is inactive." }); // Account deactivated

            // Log the login action in audit_logs based on your schema
            _context.AuditLogs.Add(new AuditLog
            {
                FkUserId = user.PkUserId,
                Action = "LOGIN",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.PkUserId),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                }, CookieAuthenticationDefaults.AuthenticationScheme)));
            return Ok(new { user.PkUserId, user.UserEmail, user.FirstName, user.LastName,
                user.PhoneNumber, role = user.Role.ToString(), user.IsActive });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== LOGIN CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }
}
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTO;

namespace backend.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AddressController : ControllerBase
{
    private readonly AppDbContext _context;

    public AddressController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserAddresses(string userId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(userId)) return BadRequest(new { error = "InvalidUserId", message = "UserId is required." });

            var addresses = await _context.Addresses
                .Where(a => a.FkUserId == userId)
                .OrderByDescending(a => a.IsDefault)
                .ThenByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(addresses);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== GET ADDRESSES CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }


    // Revised for guest checkout support: if FkUserId is null, the address is treated as a guest address and not linked to any user.
    [HttpPost("create")]
public async Task<IActionResult> CreateAddress([FromBody] CreateAddressRequest request)
    {
        try
        {
            if (request == null) return BadRequest(new { error = "NullRequest", message = "Request body is empty." });
            
            // Truncate user ID if it exceeds the 40-character database column limit
            if (!string.IsNullOrEmpty(request.FkUserId) && request.FkUserId.Length > 40)
            {
                request.FkUserId = request.FkUserId.Substring(0, 40);
            }

            if (!string.IsNullOrEmpty(request.FkUserId))
            {
                var userExists = await _context.Users.AnyAsync(u => u.PkUserId == request.FkUserId);
                if (!userExists) return NotFound(new { error = "UserNotFound", message = "The specified user does not exist." });

                if (request.IsDefault)
                {
                    var existingDefaults = await _context.Addresses
                        .Where(a => a.FkUserId == request.FkUserId && a.AddressType == request.AddressType && a.IsDefault)
                        .ToListAsync();

                    foreach (var addr in existingDefaults)
                    {
                        addr.IsDefault = false;
                        addr.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            var address = new Address
            {
                FkUserId = request.FkUserId,
                RecipientName = request.RecipientName,
                Phone = request.Phone,
                Line1 = request.Line1,
                Line2 = request.Line2,
                Barangay = request.Barangay,
                City = request.City,
                Province = request.Province,
                PostalCode = request.PostalCode,
                Country = request.Country,
                IsDefault = request.IsDefault,
                AddressType = request.AddressType,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Addresses.Add(address);
            await _context.SaveChangesAsync();

            return Ok(address);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== CREATE ADDRESS CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message });
        }
    }

    [HttpDelete("{addressId}")]
    public async Task<IActionResult> DeleteAddress(string addressId)
    {
        try
        {
            var address = await _context.Addresses.FindAsync(addressId);
            if (address == null) return NotFound(new { error = "AddressNotFound", message = "Address not found." });

            _context.Addresses.Remove(address);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Address deleted successfully." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"=== DELETE ADDRESS CRASH ===\n{ex}");
            return StatusCode(500, new { error = "InternalServerError", message = ex.Message, stackTrace = ex.ToString() });
        }
    }
}
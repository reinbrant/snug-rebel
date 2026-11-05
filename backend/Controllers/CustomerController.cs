using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class CustomerController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCustomers() => Ok(await context.Users.AsNoTracking()
        .Where(u => u.Role == UserRole.Customer)
        .OrderBy(u => u.FirstName).Select(u => new
        {
            id = u.PkUserId, name = u.FirstName + " " + u.LastName, email = u.UserEmail,
            orders = u.Orders.Count(),
            lifetime = u.Orders.Where(o => o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.Refunded)
                .Sum(o => o.TotalAmount)
        }).ToListAsync());
}

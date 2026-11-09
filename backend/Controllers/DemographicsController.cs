using System.Security.Claims;
using backend.Data;
using backend.DTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/Account/demographics")]
public class DemographicsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id == null) return Unauthorized();
        var saved = await context.CustomerDemographics.AsNoTracking().SingleOrDefaultAsync(d => d.UserId == id, cancellationToken);
        return Ok(new DemographicsDTO(saved != null, saved?.AgeRange, saved?.Gender));
    }

    [HttpPut]
    public async Task<IActionResult> Save(DemographicsRequest request, CancellationToken cancellationToken)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id == null) return Unauthorized();
        if (!request.ShareForAnalytics)
        {
            await context.CustomerDemographics.Where(d => d.UserId == id).ExecuteDeleteAsync(cancellationToken);
            return Ok(new DemographicsDTO(false, null, null));
        }
        // Atomic upsert also handles concurrent saves from multiple tabs.
        await context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO customer_demographics (_fk_user_id, age_range, gender, updated_at)
            VALUES ({id}, {request.AgeRange}, {request.Gender}, {DateTime.UtcNow})
            ON CONFLICT (_fk_user_id) DO UPDATE
            SET age_range = EXCLUDED.age_range, gender = EXCLUDED.gender, updated_at = EXCLUDED.updated_at
            """, cancellationToken);
        return Ok(new DemographicsDTO(true, request.AgeRange, request.Gender));
    }
}

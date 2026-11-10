using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/Audit")]
[Authorize(Roles = "Admin")]
public class AuditController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? actionType, [FromQuery] string? search,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 100 || search?.Length > 200
            || actionType?.Length > 40 || from > to)
            return BadRequest(new { message = "Invalid audit filters. Use a valid date range and a page size from 1 to 100." });
        var query = context.AuditLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(actionType)) query = query.Where(a => a.ActionType == actionType);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a => a.Description.ToLower().Contains(term) || a.ActorName.ToLower().Contains(term)
                || a.Action.ToLower().Contains(term) || (a.EntityId != null && a.EntityId.ToLower().Contains(term)));
        }
        if (from != null) query = query.Where(a => a.CreatedAt >= from);
        if (to != null) query = query.Where(a => a.CreatedAt < to);
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(a => a.CreatedAt).ThenByDescending(a => a.PkAuditLogId)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        // Set UTC after materialization: SQL timestamp-without-time-zone drops DateTime.Kind.
        var items = rows.Select(a => new
            {
                id = a.PkAuditLogId, a.Action, a.ActionType, a.Description, a.ActorName, a.ActorRole,
                actorId = a.FkUserId, a.EntityType, a.EntityId, a.Changes, a.RequestId, a.IpAddress,
                createdAt = DateTime.SpecifyKind(a.CreatedAt, DateTimeKind.Utc)
            }).ToList();
        var actionTypes = await context.AuditLogs.Select(a => a.ActionType).Distinct().OrderBy(a => a).ToListAsync(cancellationToken);
        return Ok(new { items, total, page, pageSize, actionTypes });
    }
}

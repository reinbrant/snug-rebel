using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] string? month = null)
    {
        var targetMonth = TryParseMonth(month) ?? DateTime.UtcNow;
        var monthStart = new DateTime(targetMonth.Year, targetMonth.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var dailyCounts = await _context.Orders
            .AsNoTracking()
            .Where(o => o.PlacedAt >= monthStart && o.PlacedAt < monthEnd)
            .GroupBy(o => o.PlacedAt.Date)
            .Select(g => new
            {
                date = g.Key,
                orders = g.Count(),
                total = g.Sum(x => x.TotalAmount),
            })
            .OrderBy(x => x.date)
            .ToListAsync();

        var countsOnly = dailyCounts.Select(x => x.orders).ToList();
        var minimum = countsOnly.Any() ? countsOnly.Min() : 0;
        var average = countsOnly.Any() ? (int)Math.Round(countsOnly.Average()) : 0;
        var maximum = countsOnly.Any() ? countsOnly.Max() : 0;

        var firstDayOfMonth = new DateTime(monthStart.Year, monthStart.Month, 1);
        var leadingDays = (int)firstDayOfMonth.DayOfWeek;
        var calendarStart = firstDayOfMonth.AddDays(-leadingDays);

        var calendarDays = Enumerable.Range(0, (int)Math.Ceiling((leadingDays + DateTime.DaysInMonth(monthStart.Year, monthStart.Month)) / 7d) * 7)
            .Select(offset => calendarStart.AddDays(offset))
            .Select(day =>
            {
                var dateKey = day.Date.ToString("yyyy-MM-dd");
                var entry = dailyCounts.FirstOrDefault(x => x.date.ToString("yyyy-MM-dd") == dateKey);

                return new
                {
                    date = dateKey,
                    value = entry == null ? 0d : Math.Max(0.12d, (double)entry.orders / Math.Max(maximum, 1)),
                    orders = entry?.orders ?? 0,
                    total = entry?.total ?? 0m,
                    isCurrentDay = day.Date == DateTime.UtcNow.Date,
                };
            })
            .ToList();

        return Ok(new
        {
            minimumNumber = minimum,
            averageNumber = average,
            maximumNumber = maximum,
            monthLabel = monthStart.ToString("MMMM yyyy"),
            days = calendarDays,
        });
    }

    [HttpGet("activities")]
    public async Task<IActionResult> GetActivities([FromQuery] string? status = null)
    {
        var query = _context.Orders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
                return BadRequest(new { message = "Invalid order status." });
            query = query.Where(o => o.Status == orderStatus);
        }
        var orders = await query.Include(o => o.FkShippingAddress).Include(o => o.OrderItems)
            .OrderByDescending(o => o.PlacedAt).Take(20).ToListAsync();
        return Ok(new { items = orders.Select(order => new
        {
            orderId = order.PkOrderId, orderNumber = order.OrderNumber,
            category = order.OrderItems.FirstOrDefault()?.ProductName ?? "General",
            weight = $"{order.OrderItems.Sum(i => i.Quantity)} items",
            company = order.FkShippingAddress?.City ?? "Snug Rebel",
            arrivalTime = order.PlacedAt,
            route = $"{order.FkShippingAddress?.City} - {order.FkShippingAddress?.Province}",
            price = order.TotalAmount, status = order.Status.ToString()
        }) });
    }

    private static DateTime? TryParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            return null;
        }

        if (DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
        {
            return parsed;
        }

        return null;
    }
}

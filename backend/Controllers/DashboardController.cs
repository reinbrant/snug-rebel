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

        var calendarDays = Enumerable.Range(0, 35)
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
        var query = _context.DashboardNotifications.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(n => n.Status == status);
        }

        var notifications = await query
            .OrderByDescending(n => n.ArrivalTime)
            .Take(20)
            .Select(n => new
            {
                orderId = n.OrderId,
                orderNumber = n.OrderNumber,
                category = n.Category,
                weight = n.Weight,
                company = n.Company,
                arrivalTime = n.ArrivalTime,
                route = n.Route,
                price = n.Price,
                status = n.Status,
            })
            .ToListAsync();

        if (!notifications.Any())
        {
            await SeedNotificationRowsAsync();
            notifications = await query
                .OrderByDescending(n => n.ArrivalTime)
                .Take(20)
                .Select(n => new
                {
                    orderId = n.OrderId,
                    orderNumber = n.OrderNumber,
                    category = n.Category,
                    weight = n.Weight,
                    company = n.Company,
                    arrivalTime = n.ArrivalTime,
                    route = n.Route,
                    price = n.Price,
                    status = n.Status,
                })
                .ToListAsync();
        }

        if (!notifications.Any())
        {
            var realOrders = await _context.Orders
                .Include(o => o.FkShippingAddress)
                .Include(o => o.OrderItems)
                .OrderByDescending(o => o.PlacedAt)
                .Take(20)
                .ToListAsync();

            notifications = realOrders
                .Select(order => new
                {
                    orderId = order.PkOrderId,
                    orderNumber = order.OrderNumber,
                    category = order.OrderItems.FirstOrDefault()?.ProductName ?? "General",
                    weight = order.OrderItems.Sum(item => item.Quantity) + " items",
                    company = order.FkShippingAddress != null ? order.FkShippingAddress.City : "Snug Rebel",
                    arrivalTime = order.PlacedAt,
                    route = order.FkShippingAddress != null
                        ? $"{order.FkShippingAddress.City} - {order.FkShippingAddress.Province}"
                        : "Local delivery",
                    price = order.TotalAmount,
                    status = order.Status.ToString(),
                })
                .ToList();
        }

        return Ok(new { items = notifications });
    }

    private async Task SeedNotificationRowsAsync()
    {
        var orders = await _context.Orders
            .Include(o => o.FkShippingAddress)
            .Include(o => o.OrderItems)
            .OrderByDescending(o => o.PlacedAt)
            .Take(20)
            .ToListAsync();

        if (!orders.Any())
        {
            return;
        }

        var rows = orders
            .Select(order => new DashboardNotification
            {
                OrderId = order.PkOrderId,
                OrderNumber = order.OrderNumber,
                Category = order.OrderItems.FirstOrDefault()?.ProductName ?? "General",
                Weight = $"{order.OrderItems.Sum(item => item.Quantity)} items",
                Company = order.FkShippingAddress?.City ?? "Snug Rebel",
                ArrivalTime = order.PlacedAt,
                Route = order.FkShippingAddress != null
                    ? $"{order.FkShippingAddress.City} - {order.FkShippingAddress.Province}"
                    : "Local delivery",
                Price = order.TotalAmount,
                Status = order.Status.ToString(),
                CreatedAt = DateTime.UtcNow,
            })
            .ToList();

        foreach (var row in rows)
        {
            row.PkDashboardNotificationId = $"dnotif-{Guid.NewGuid():N}";
        }

        _context.DashboardNotifications.AddRange(rows);
        await _context.SaveChangesAsync();
    }

    private static int GetMetricValue(List<DashboardMetric> metrics, string metricKey)
    {
        var metric = metrics.FirstOrDefault(m => m.MetricKey == metricKey);
        return metric == null ? 0 : Convert.ToInt32(metric.MetricValue);
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

using System.Globalization;

namespace backend.Services;

public record InsightOrder(DateTime PlacedAt, decimal Sales, string CustomerKey, string Province, string Country);
public record SalesMonth(string Month, decimal Sales, int Orders, bool Observed, decimal? PreviousYearSales);
public record CustomerRegion(string Region, int Orders, int Customers, decimal Sales, decimal Share);
public record InsightAction(string Title, string Evidence, string Action);
public record SalesForecast(bool Available, decimal? Sales, decimal? Lower, decimal? Upper, int? Orders, int HistoryDays, int HistoryOrders, string Method);
public record SalesInsightsResult(string GeneratedAt, int WindowDays, string PeriodStart, string PeriodEnd,
    int Orders, decimal Sales, decimal AverageOrderValue, decimal? SalesChangePercent,
    int Customers, int RepeatCustomers, int UnidentifiedOrders, List<CustomerRegion> Regions,
    List<SalesMonth> Months, SalesForecast Forecast, List<InsightAction> Actions);

/// <summary>Deterministic estimates from completed Philippine calendar days; no external AI service.</summary>
public static class SalesInsights
{
    public static SalesInsightsResult Calculate(IReadOnlyList<InsightOrder> source, DateTime utcNow, int windowDays)
    {
        var today = utcNow.AddHours(8).Date;
        var historyStart = new DateTime(today.Year, today.Month, 1).AddMonths(-24);
        var orders = source.Select(o => o with { PlacedAt = o.PlacedAt.AddHours(8).Date })
            .Where(o => o.PlacedAt >= historyStart && o.PlacedAt < today).ToList();
        var start = today.AddDays(-windowDays);
        var current = orders.Where(o => o.PlacedAt >= start).ToList();
        var previous = orders.Where(o => o.PlacedAt >= start.AddDays(-windowDays) && o.PlacedAt < start).Sum(o => o.Sales);
        var sales = current.Sum(o => o.Sales);
        var first = orders.Count > 0 ? orders.Min(o => o.PlacedAt) : today;
        decimal? change = previous > 0 && first <= start.AddDays(-windowDays)
            ? Math.Round((sales - previous) / previous * 100, 1) : null;
        var customers = current.Where(o => o.CustomerKey.Length > 0).GroupBy(o => o.CustomerKey).ToList();
        var repeat = customers.Count(g => g.Count() > 1);
        var regions = current.GroupBy(o => Region(o.Province, o.Country))
            .Select(g => new CustomerRegion(g.Key, g.Count(), g.Where(o => o.CustomerKey.Length > 0).Select(o => o.CustomerKey).Distinct().Count(),
                g.Sum(o => o.Sales), Math.Round(g.Count() * 100m / current.Count, 1)))
            .OrderByDescending(g => g.Orders).ThenBy(g => g.Region).ToList();
        var firstMonth = new DateTime(first.Year, first.Month, 1);
        var months = Enumerable.Range(0, 24).Select(i => {
            var month = historyStart.AddMonths(i);
            var entries = orders.Where(o => o.PlacedAt >= month && o.PlacedAt < month.AddMonths(1)).ToList();
            decimal? lastYear = month.AddYears(-1) >= first && month.AddYears(-1) >= historyStart
                ? orders.Where(o => o.PlacedAt >= month.AddYears(-1) && o.PlacedAt < month.AddYears(-1).AddMonths(1)).Sum(o => o.Sales) : null;
            return new SalesMonth(month.ToString("yyyy-MM", CultureInfo.InvariantCulture), entries.Sum(o => o.Sales), entries.Count, month >= firstMonth, lastYear);
        }).ToList();

        var forecastStart = new[] { today.AddDays(-56), first }.Max();
        var days = (today - forecastStart).Days;
        var recent = orders.Where(o => o.PlacedAt >= forecastStart).ToList();
        var available = days >= 28 && recent.Count >= 10;
        decimal? predictedSales = null, lower = null, upper = null;
        int? predictedOrders = null;
        if (available)
        {
            // Include zero-sale days, using up to eight observations of each weekday.
            var calendar = Enumerable.Range(0, days).Select(i => forecastStart.AddDays(i)).ToList();
            var totals = recent.GroupBy(o => o.PlacedAt).ToDictionary(g => g.Key, g => g.Sum(o => o.Sales));
            var counts = recent.GroupBy(o => o.PlacedAt).ToDictionary(g => g.Key, g => g.Count());
            var future = Enumerable.Range(0, 30).Select(i => today.AddDays(i)).ToList();
            predictedSales = Math.Round(future.Sum(d => calendar.Where(c => c.DayOfWeek == d.DayOfWeek).Average(c => totals.GetValueOrDefault(c))), 2);
            predictedOrders = (int)Math.Round(future.Sum(d => calendar.Where(c => c.DayOfWeek == d.DayOfWeek).Average(c => (decimal)counts.GetValueOrDefault(c))));
            var weekly = Enumerable.Range(0, days / 7).Select(i => calendar.Skip(i * 7).Take(7).Sum(c => totals.GetValueOrDefault(c))).ToList();
            var mean = weekly.Average();
            var deviation = Math.Sqrt(weekly.Average(v => Math.Pow((double)(v - mean), 2)));
            var spread = mean > 0 ? Math.Clamp((decimal)deviation / mean, 0.2m, 1m) : 1m;
            lower = Math.Round(predictedSales.Value * (1 - spread), 2);
            upper = Math.Round(predictedSales.Value * (1 + spread), 2);
        }
        var forecast = new SalesForecast(available, predictedSales, lower, upper, predictedOrders, days, recent.Count,
            "Next 30 days: average sales and orders for each weekday over up to 8 completed weeks, including zero-sale days. Range reflects weekly variability (minimum ±20%); it is a planning scenario, not a confidence interval. Requires 28 days and 10 qualifying orders. No annual seasonal adjustment.");
        var actions = new List<InsightAction>();
        if (!available) actions.Add(new("Build the forecast history", $"{days} completed history days and {recent.Count} qualifying orders in the forecast window.", "Collect at least 28 days and 10 qualifying orders before using a sales forecast for purchasing decisions."));
        if (change is <= -15) actions.Add(new("Review the sales slowdown", $"Sales are down {Math.Abs(change.Value):0.#}% against the previous {windowDays} days.", "Review traffic, checkout failures and product availability before testing a promotion."));
        if (change is >= 15) actions.Add(new("Prepare for recent demand", $"Sales are up {change.Value:0.#}% against the previous {windowDays} days.", "Check stock and fulfillment capacity for your best sellers before increasing marketing spend."));
        if (customers.Count >= 10 && repeat * 100m / customers.Count < 20)
            actions.Add(new("Encourage a second purchase", $"{repeat} of {customers.Count} identifiable customers ordered more than once during this period.", "Test a follow-up offer or complementary product recommendation with customers who opted into marketing."));
        var top = regions.FirstOrDefault(r => r.Region != "Unknown location");
        if (current.Count >= 10 && top is { Share: >= 40 })
            actions.Add(new("Review service in your strongest region", $"{top.Region} accounts for {top.Share:0.#}% of orders ({top.Orders}).", "Check delivery times and shipping costs in this region; test a small regional campaign and measure its results."));
        var comparable = months.Where(m => m.PreviousYearSales > 0 && m.Observed).OrderByDescending(m => m.Sales).FirstOrDefault();
        if (comparable != null)
            actions.Add(new("Plan around observed monthly demand", $"{comparable.Month} recorded ₱{comparable.Sales:0.00}, compared with ₱{comparable.PreviousYearSales:0.00} in the same month a year earlier.", "Compare repeated peaks in the monthly table before scheduling seasonal inventory or campaigns; one peak alone does not establish a seasonal pattern."));
        if (actions.Count == 0) actions.Add(new("Establish a sales baseline", $"{current.Count} qualifying orders in the last {windowDays} completed days.", "Review the monthly and customer breakdowns regularly and measure one merchandising or retention experiment at a time."));
        return new(utcNow.ToString("O"), windowDays, start.ToString("yyyy-MM-dd"), today.AddDays(-1).ToString("yyyy-MM-dd"),
            current.Count, sales, current.Count > 0 ? Math.Round(sales / current.Count, 2) : 0, change,
            customers.Count, repeat, current.Count(o => o.CustomerKey.Length == 0), regions, months, forecast, actions);
    }

    private static string Region(string province, string country) => string.IsNullOrWhiteSpace(province)
        ? (string.IsNullOrWhiteSpace(country) ? "Unknown location" : country.Trim())
        : $"{province.Trim()}, {(string.IsNullOrWhiteSpace(country) ? "Unknown country" : country.Trim())}";

    // Legacy anonymous checkouts share this placeholder; they must never become one repeat customer.
    public static string CustomerKey(string? email, string? userId)
    {
        var normalized = email?.Trim().ToLowerInvariant();
        return !string.IsNullOrWhiteSpace(normalized) && normalized != "guest@snugrebel.local"
            ? "email:" + normalized : userId ?? "";
    }
}

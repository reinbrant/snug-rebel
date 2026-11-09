using System.Globalization;

namespace backend.Services;

public record SeasonalProjection(string Month, decimal Sales, decimal Lower, decimal Upper, int Orders, decimal SeasonalIndex);
public record SeasonalForecast(bool Available, string Message, int CompleteMonths, int HistoryOrders, string Method, List<SeasonalProjection> Months);

public static class SeasonalSalesForecast
{
    private const string Method = "Six complete months starting next month. Month-of-year factors compare daily sales in each of the last two completed 12-month blocks with that block's daily average. Factors are averaged, moderated halfway toward 1 and capped at 0.5–2. Recent 90-day demand is adjusted for those factors, then projected using each future month's length. Orders use their own factors. Planning ranges reflect historical variation after adjustment, with a minimum ±25%; they are not confidence intervals. No holiday or campaign assumptions are added.";

    // Orders supplied here already use completed Philippine calendar dates.
    public static SeasonalForecast Calculate(IReadOnlyList<InsightOrder> orders, DateTime today, DateTime firstObserved)
    {
        var currentMonth = new DateTime(today.Year, today.Month, 1);
        var start = currentMonth.AddMonths(-24);
        var months = Enumerable.Range(0, 24).Select(i =>
        {
            var month = start.AddMonths(i);
            var sales = orders.Where(o => o.PlacedAt >= month && o.PlacedAt < month.AddMonths(1)).ToList();
            return new MonthData(month, sales.Sum(o => o.Sales), sales.Count, DateTime.DaysInMonth(month.Year, month.Month));
        }).ToList();
        var complete = months.Count(m => m.Date >= firstObserved);
        var historyOrders = months.Sum(m => m.Orders);
        SeasonalForecast Unavailable(string message) => new(false, message, complete, historyOrders, Method, []);
        if (complete < 24)
            return Unavailable($"Seasonal forecasting needs 24 complete months of recorded history; {complete} are available. The short-term forecast above remains based on recent weekday demand.");
        if (historyOrders < 60 || months.Count(m => m.Orders > 0) < 18 || months.Take(12).Sum(m => m.Orders) < 10 || months.Skip(12).Sum(m => m.Orders) < 10)
            return Unavailable("Seasonal forecasting needs at least 60 qualifying orders, sales activity in 18 of the last 24 months, and at least 10 orders in each 12-month block.");
        if (months.Take(12).Sum(m => m.Sales) <= 0 || months.Skip(12).Sum(m => m.Sales) <= 0)
            return Unavailable("Positive merchandise sales are needed in both completed 12-month blocks to estimate seasonal patterns.");

        var salesFactors = Factors(months, m => m.Sales);
        var orderFactors = Factors(months, m => m.Orders);
        var recentStart = today.AddDays(-90);
        var recent = orders.Where(o => o.PlacedAt >= recentStart && o.PlacedAt < today).ToList();
        var dailySales = recent.Sum(o => o.Sales / salesFactors[o.PlacedAt.Month]) / 90;
        var dailyOrders = recent.Sum(o => 1m / orderFactors[o.PlacedAt.Month]) / 90;

        // Normalize each block to avoid treating overall business growth as random variation.
        var residuals = new List<double>();
        foreach (var block in months.Chunk(12))
        {
            var level = block.Sum(m => m.Sales) / block.Sum(m => m.Days);
            residuals.AddRange(block.Select(m => (double)(m.Sales / m.Days / level / salesFactors[m.Date.Month])));
        }
        var mean = residuals.Average();
        var variation = Math.Sqrt(residuals.Average(value => Math.Pow(value - mean, 2)));
        var spread = Math.Clamp((decimal)(variation / mean), .25m, 1m);
        var projected = Enumerable.Range(1, 6).Select(i =>
        {
            var month = currentMonth.AddMonths(i);
            var days = DateTime.DaysInMonth(month.Year, month.Month);
            var sales = Math.Round(dailySales * days * salesFactors[month.Month], 2);
            return new SeasonalProjection(month.ToString("yyyy-MM", CultureInfo.InvariantCulture), sales,
                Math.Round(sales * (1 - spread), 2), Math.Round(sales * (1 + spread), 2),
                (int)Math.Round(dailyOrders * days * orderFactors[month.Month]), Math.Round(salesFactors[month.Month], 2));
        }).ToList();
        return new(true, "Seasonal estimates use two annual cycles and recent demand. Review them alongside promotions and stock availability.", complete, historyOrders, Method, projected);
    }

    private static Dictionary<int, decimal> Factors(List<MonthData> months, Func<MonthData, decimal> value)
    {
        var normalized = months.Chunk(12).SelectMany(block =>
        {
            var dailyAverage = block.Sum(value) / block.Sum(m => m.Days);
            return block.Select(m => (Month: m.Date.Month, Ratio: value(m) / m.Days / dailyAverage));
        });
        return normalized.GroupBy(m => m.Month).ToDictionary(g => g.Key, g => Math.Clamp(.5m + .5m * g.Average(m => m.Ratio), .5m, 2m));
    }

    private record MonthData(DateTime Date, decimal Sales, int Orders, int Days);
}

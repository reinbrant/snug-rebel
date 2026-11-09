using backend.Services;

// Dependency-free regression checks; run: dotnet run --project tests/Analytics.Tests
var now = new DateTime(2026, 11, 9, 4, 0, 0, DateTimeKind.Utc);
var today = now.AddHours(8).Date;
var passed = 0;
void Check(bool condition, string description)
{
    if (!condition) throw new Exception(description);
    passed++;
}
InsightOrder Order(DateTime localDate, decimal sales = 100, string key = "customer") =>
    new(DateTime.SpecifyKind(localDate.AddHours(-8), DateTimeKind.Utc), sales, key, "CEBU", "PH");

var empty = SalesInsights.Calculate([], now, 90);
Check(empty.Orders == 0 && empty.Sales == 0 && empty.Customers == 0, "Empty store has zero metrics");
Check(!empty.Forecast.Available && empty.Forecast.Sales == null, "Empty store must not have a forecast");
Check(empty.Months.Count == 24 && empty.Months.All(m => !m.Observed), "Missing history is not recorded as zero sales");
Check(empty.Actions.Count > 0 && empty.Regions.Count == 0, "Empty store has an actionable empty state");

var constant = Enumerable.Range(1, 56).Select(i => Order(today.AddDays(-i))).ToList();
var stable = SalesInsights.Calculate(constant, now, 30);
Check(stable.Orders == 30 && stable.Sales == 3000 && stable.AverageOrderValue == 100, "Rolling window includes exactly 30 completed days");
Check(stable.Forecast.Available && stable.Forecast.Sales == 3000 && stable.Forecast.Orders == 30, "Constant sales forecast preserves daily rate");
Check(stable.Forecast.Lower == 2400 && stable.Forecast.Upper == 3600, "Stable sales retain the minimum planning range");
Check(stable.Customers == 1 && stable.RepeatCustomers == 1 && stable.Regions[0].Share == 100, "Repeat customers and geographic share are aggregated");
Check(stable.SalesChangePercent == null, "Partial baseline cannot be reported as growth");

var sparse = Enumerable.Range(0, 10).Select(i => Order(today.AddDays(-56 + i * 5))).ToList();
var intermittent = SalesInsights.Calculate(sparse, now, 90);
Check(intermittent.Forecast.Available && intermittent.Forecast.Sales < 1000, "Zero-sale days reduce the forecast rather than being dropped");
Check(!SalesInsights.Calculate(sparse.Take(9).ToList(), now, 90).Forecast.Available, "Fewer than ten orders cannot produce a forecast");
Check(!SalesInsights.Calculate(constant.Take(27).ToList(), now, 90).Forecast.Available, "Fewer than 28 days cannot produce a forecast");

var boundary = new List<InsightOrder> {
    Order(today.AddDays(-30)), Order(today.AddDays(-31)),
    Order(today.AddDays(-1).AddHours(23).AddMinutes(59)), Order(today), Order(today.AddDays(1))
};
var dates = SalesInsights.Calculate(boundary, now, 30);
Check(dates.Orders == 2 && dates.PeriodEnd == "2026-11-08", "Philippine midnight boundaries exclude today and old orders");

var trend = Enumerable.Range(1, 60).Select(i => Order(today.AddDays(-i), i <= 30 ? 200 : 100)).ToList();
var growing = SalesInsights.Calculate(trend, now, 30);
Check(growing.SalesChangePercent == 100 && growing.Actions.Any(a => a.Title == "Prepare for recent demand"), "Growth recommendation requires a complete baseline and evidence");

var history = new List<InsightOrder> { Order(new DateTime(2024, 12, 1)), Order(new DateTime(2025, 10, 5), 200), Order(new DateTime(2026, 10, 5), 300) };
var annual = SalesInsights.Calculate(history, now, 365);
Check(annual.Months.Single(m => m.Month == "2026-10").PreviousYearSales == 200, "Year-over-year comparisons use the same complete month");
Check(!annual.Months.Single(m => m.Month == "2024-11").Observed, "Months before the first order have no history");
Check(annual.Months.Single(m => m.Month == "2025-01").Observed && annual.Months.Single(m => m.Month == "2025-01").Sales == 0, "Quiet months after the first order are zero sales");

Check(SalesInsights.CustomerKey(" GUEST@SNUGREBEL.LOCAL ", null) == "", "Anonymous placeholder must not merge guest customers");
Check(SalesInsights.CustomerKey(" Buyer@Example.com ", null) == "email:buyer@example.com", "Email matching ignores casing and whitespace");
Check(SalesInsights.CustomerKey(null, "user-1") == "user-1", "Account ID is a fallback identifier");
Console.WriteLine($"Passed {passed} analytics regression checks.");

using backend.Services;
using backend.DTO;
using System.ComponentModel.DataAnnotations;

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

var historyStart = new DateTime(today.Year, today.Month, 1).AddMonths(-24);
var seasonalOrders = Enumerable.Range(0, (today - historyStart).Days)
    .Select(day => { var date = historyStart.AddDays(day); return Order(date, date.Month == 12 ? 300 : 100); }).ToList();
var seasonal = SalesInsights.Calculate(seasonalOrders, now, 90).SeasonalForecast;
Check(seasonal.Available && seasonal.Months.Count == 6, "Two complete annual cycles enable six seasonal projections");
Check(seasonal.Months.First().Month == "2026-12" && seasonal.Months.Last().Month == "2027-05", "Seasonal horizon starts with the next complete month and crosses years");
var december = seasonal.Months.Single(m => m.Month == "2026-12");
var february = seasonal.Months.Single(m => m.Month == "2027-02");
Check(december.SeasonalIndex > february.SeasonalIndex && december.Sales > february.Sales, "Repeated December peaks affect the seasonal forecast");
Check(seasonal.Months.All(m => m.Lower >= 0 && m.Lower <= m.Sales && m.Upper >= m.Sales), "Seasonal scenarios bound estimates and stay nonnegative");
Check(!SalesInsights.Calculate(constant, now, 90).SeasonalForecast.Available, "Short history must not invent annual seasonality");
Check(!SalesInsights.Calculate(seasonalOrders.Skip(1).ToList(), now, 90).SeasonalForecast.Available, "A partial oldest month cannot complete two annual cycles");
var lowActivity = seasonalOrders.Where((_, index) => index % 30 == 0).ToList();
Check(!SalesInsights.Calculate(lowActivity, now, 90, historyBeganUtc: Order(historyStart).PlacedAt).SeasonalForecast.Available, "Calendar coverage alone cannot enable a sparse seasonal forecast");
var flatOrders = seasonalOrders.Select(o => o with { Sales = 100 }).ToList();
var flatSeasonal = SalesInsights.Calculate(flatOrders, now, 90).SeasonalForecast;
Check(flatSeasonal.Months.All(m => m.SeasonalIndex == 1), "Constant daily sales have no monthly factor despite different month lengths");
Check(Math.Abs(flatSeasonal.Months[0].Sales / 31 - flatSeasonal.Months[2].Sales / 28) < .01m, "Monthly projection accounts for calendar month length");
var quiet = SalesInsights.Calculate(seasonalOrders.Where(o => o.PlacedAt < today.AddDays(-91)).ToList(), now, 90);
Check(quiet.SeasonalForecast.Available && quiet.SeasonalForecast.Months.All(m => m.Sales == 0), "Old seasonal peaks cannot invent demand after 90 quiet days");
var zeroHistory = seasonalOrders.Select(o => o with { Sales = 0 }).ToList();
Check(!SalesInsights.Calculate(zeroHistory, now, 90).SeasonalForecast.Available, "Free orders cannot establish revenue seasonality");
var knownHistory = SalesInsights.Calculate(constant, now, 90, historyBeganUtc: Order(historyStart.AddMonths(-1)).PlacedAt);
Check(knownHistory.Months.All(m => m.Observed), "Earlier known history preserves observed zero months in the retained window");

var demographicOrders = new List<InsightOrder> {
    Order(today.AddDays(-1)) with { UserId = "one" }, Order(today.AddDays(-2)) with { UserId = "one" },
    Order(today.AddDays(-1)) with { UserId = "two" }, Order(today.AddDays(-1)) with { UserId = "three" },
    Order(today.AddDays(-1)), Order(today.AddDays(-91)) with { UserId = "old" }
};
var demographicProfiles = new List<DemographicProfile> { new("one", "25-34", "woman"), new("two", null, "man"), new("old", "55+", "man") };
var demographics = SalesInsights.Calculate(demographicOrders, now, 90, demographicProfiles).Demographics;
Check(demographics.RegisteredCustomers == 3 && demographics.SharedProfiles == 2 && demographics.GuestOrders == 1, "Demographics count unique registered buyers within the reporting window");
Check(demographics.AgeRanges.Single(b => b.Label == "25–34").Customers == 1, "Repeated orders do not multiply a demographic response");
Check(demographics.AgeRanges.Single(b => b.Label == "Not shared").Customers == 2, "Unanswered age ranges and missing profiles remain visible");
Check(demographics.Genders.Sum(b => b.Customers) == 3 && demographics.Genders.Single(b => b.Label == "Woman").Share == 33.3m, "Each demographic denominator includes all registered buyers");
var withdrawn = SalesInsights.Calculate(demographicOrders, now, 90, []).Demographics;
Check(withdrawn.SharedProfiles == 0 && withdrawn.Genders.Single(b => b.Label == "Not shared").Customers == 3, "Removing profile answers removes them from future aggregates");

bool IsValid(DemographicsRequest request) => Validator.TryValidateObject(request, new ValidationContext(request), [], true);
Check(IsValid(new() { ShareForAnalytics = true, AgeRange = "18-24" }), "Customers can share only one demographic answer");
Check(!IsValid(new() { ShareForAnalytics = true, AgeRange = "invented" }), "Unsupported demographic values are rejected");
Check(!IsValid(new() { ShareForAnalytics = true }), "Sharing requires at least one optional answer");
Check(IsValid(new() { ShareForAnalytics = false }), "Customers can withdraw sharing with no replacement answers");
Console.WriteLine($"Passed {passed} analytics regression checks.");

namespace backend.Services;

public record DemographicProfile(string UserId, string? AgeRange, string? Gender);
public record DemographicBucket(string Label, int Customers, decimal Share);
public record DemographicSummary(int RegisteredCustomers, int SharedProfiles, int GuestOrders,
    List<DemographicBucket> AgeRanges, List<DemographicBucket> Genders);

public static class DemographicAnalysis
{
    public static DemographicSummary Calculate(IReadOnlyList<InsightOrder> orders, IReadOnlyList<DemographicProfile> profiles)
    {
        var ids = orders.Where(o => !string.IsNullOrEmpty(o.UserId)).Select(o => o.UserId!).Distinct().ToHashSet();
        var shared = profiles.Where(p => ids.Contains(p.UserId)).DistinctBy(p => p.UserId).ToList();
        List<DemographicBucket> Buckets(Dictionary<string, string> labels, Func<DemographicProfile, string?> field)
        {
            var result = labels.Select(pair =>
            {
                var count = shared.Count(p => field(p) == pair.Key);
                return new DemographicBucket(pair.Value, count, ids.Count == 0 ? 0 : Math.Round(count * 100m / ids.Count, 1));
            }).ToList();
            var missing = ids.Count - result.Sum(bucket => bucket.Customers);
            result.Add(new("Not shared", missing, ids.Count == 0 ? 0 : Math.Round(missing * 100m / ids.Count, 1)));
            return result;
        }
        return new(ids.Count, shared.Count, orders.Count(o => string.IsNullOrEmpty(o.UserId)),
            Buckets(new() { ["under18"] = "Under 18", ["18-24"] = "18–24", ["25-34"] = "25–34", ["35-44"] = "35–44", ["45-54"] = "45–54", ["55+"] = "55+" }, p => p.AgeRange),
            Buckets(new() { ["woman"] = "Woman", ["man"] = "Man", ["nonbinary"] = "Non-binary", ["another"] = "Another identity" }, p => p.Gender));
    }
}

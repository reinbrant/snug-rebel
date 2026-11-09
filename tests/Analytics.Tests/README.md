Run the dependency-free analytics regression checks:

```sh
dotnet run --project tests/Analytics.Tests
```

Checks cover empty and sparse data, zero-sale days, forecast gating, scenario ranges,
Philippine date boundaries, complete comparison periods, monthly year-over-year values,
customer matching, recommendations, optional demographic validation/aggregation, and seasonal
forecasts (annual coverage, recurring peaks, month lengths, zero demand and sparse history).
They use synthetic data and do not access the database.

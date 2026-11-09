# Customer demographics and seasonal forecasts

## Deployment

1. Run [backend/SQL/customer_demographics.sql](backend/SQL/customer_demographics.sql) in the Neon SQL editor. It adds one table and is safe to repeat.
2. Deploy the updated backend on Render.
3. Deploy both the admin and storefront projects on Vercel.

No new environment variables or external analytics providers are used. Existing customer
records are unchanged. The new table stores optional profile answers separately from login data.

## Demographics

Signed-in customers can share an age range, gender, or both under **My account → About you**.
Sharing starts off. Customers must enable sharing and save their preferences. They can edit
the answers, choose “Prefer not to say” for one field, or turn sharing off and save to delete
both answers. Exact birth dates and free-text gender responses are not collected.

Dashboard age/gender counts use unique registered buyers with qualifying orders during the
selected 30/90/365-day period. Guest orders are excluded and counted separately. “Not shared”
includes unanswered fields and accounts without a shared profile. Percentages use all
registered buyers in the period, so response coverage is visible. Current profile answers
are used, including for older orders; this is not age at purchase or a representative survey.
Withdrawing answers removes them from subsequent calculations; there are no demographic snapshots.

## Seasonal forecasting

The existing next-30-day forecast remains a weekday average over recent sales. The separate
seasonal panel projects the **next six complete calendar months**, starting next month.
It needs:

- 24 complete months since the first qualifying order.
- At least 60 qualifying orders in those months.
- Order activity in at least 18 months and 10 orders in each 12-month block.
- Positive merchandise sales in both blocks.

Each historical month's daily sales are compared with its 12-month block's daily average,
which reduces the effect of annual business growth. The two observations for each calendar
month are averaged; the factor is moderated halfway toward 1 and limited to 0.5–2.
The model adjusts the last 90 completed days for these factors, then applies future
month factors and calendar lengths. Order estimates use separately calculated order factors.
Zero-sale days and months after recorded history begins remain part of the calculation.

Planning ranges reflect historical variation after the adjustment, with a minimum ±25%.
They are scenarios, not confidence intervals. Forecasts assume recent demand continues;
they do not include future promotions, stock availability or specific holiday effects.
When there is insufficient history, the seasonal panel explains the missing coverage and
the short-term forecast remains available if its own minimum history is met.

## Verification

```sh
dotnet run --project tests/Analytics.Tests
npm --prefix frontend run build
npm --prefix admin run build
dotnet build backend/backend.csproj
```

Regression checks use synthetic data and do not access Neon.

For a dashboard demonstration with reversible SQL data, see
[the analytics demo instructions](backend/SQL/ANALYTICS_DEMO.md).

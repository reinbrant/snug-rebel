# Reversible analytics demo

1. Apply [customer_demographics.sql](customer_demographics.sql) if it has not been run yet.
2. Copy the **entire** [analytics_demo_seed.sql](analytics_demo_seed.sql) into the Neon SQL editor and run it once.
3. Refresh the deployed admin dashboard. The backend must include the latest analytics code.
4. When finished, run the **entire** [analytics_demo_cleanup.sql](analytics_demo_cleanup.sql) in the same database, then refresh the dashboard.

The seed inserts 26 complete months plus the completed days of the current month: several
thousand orders with December/November demand peaks, weekend variation and gradual growth.
It also inserts 60 disabled customer accounts, 72 shipping addresses, payments, and 45
demographic profiles. Some orders are guest checkouts; some profile answers are unshared.
No product, variant, inventory, promotion, order item or shipping records are changed.
Recent activity can consequently show “General” and “0 items” for these synthetic orders.

Demo IDs start with `srda_v1_`; order numbers start with `DEMOA1-`. Accounts use the reserved
`example.invalid` email domain and cannot sign in. SQL insertion does not call email or
payment providers. All dates are calculated from the current Philippine date, then stored
as UTC timestamps to match the app.

**Demo orders intentionally count in analytics:** they use `is_test = false`, because the
dashboard excludes test orders. They temporarily mix with existing report totals and may
dominate forecasts, so remove them before relying on reports for actual decisions.

Both operations use transactions. The seed only inserts; it never overwrites existing
records. A duplicate ID or email aborts it instead of adopting an existing row. Running
the seed again while it is installed aborts safely; clean it up first to refresh its dates.
The script supplies its own IDs and order numbers and never resets application sequences.

Keep `snug_analytics_demo_v1_manifest` until cleanup. It records every inserted ID and its
row fingerprint. Cleanup deletes only those exact IDs, in foreign-key order, then removes
the manifest. Running cleanup again is a no-op. Missing demo rows are tolerated.

Treat demo records as read-only. If a demo row is edited, its schema changes, or an unexpected
related record prevents deletion, cleanup rolls back instead of guessing what is safe to
remove. Inspect those changes before retrying. Unrelated customer/order data is never
selected for deletion. Only the demo manifest table is dropped; application tables remain.

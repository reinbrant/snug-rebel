# Audit history

Before deploying the backend, the database owner must apply
`backend/SQL/audit_log_details.sql`. This additive script is safe to repeat and
preserves existing entries. Deploy the API and admin frontend together afterward.

Administrators can open **Audit log** in the admin navigation (`/audit`). Staff
and customers cannot read the audit API. Search by actor, action, description or
record ID; filter by action type and Philippine date range. Results are paginated
with the newest entries first. Expand an entry to see selected before/after values,
the actor ID, request reference, and observed connection IP. Behind a reverse
proxy, that IP may identify the proxy; forwarded headers are not trusted here.

Each entry has an action type, specific action, descriptive summary, actor name
and role at the time, record type and ID, UTC timestamp, request reference, and
selected changed fields. Example: **Orders / ORDER UPDATED** — Updated Order
“SR-261110-1001”. Status: Processing → Shipped.

Recorded events:

| Action type | Events and selected details |
| --- | --- |
| Authentication | Registration, password/email-code sign-in, logout, password reset |
| Catalog | Product creation/deletion, name, price, category and activation changes; image/model creation and deletion |
| Inventory | Variant creation/deletion, SKU, stock, reorder level, price override, size/color IDs and activation changes |
| Categories | Creation/deletion, name, slug and activation changes |
| Orders | Creation/deletion, order number, status and monetary changes |
| Shipping | Creation/deletion, courier, status, shipped/delivered dates |
| Promotions | Creation/deletion, code, discount type/value, maximum uses and activation changes |
| Reviews | Creation/deletion, product/order-item IDs and rating changes |

Domain records and their audit entries share the same transaction. If the business
operation or the audit write fails, neither commits. Authenticated requests use
the server session for attribution. Anonymous HTTP operations are marked Guest;
operations without an HTTP request are marked System.

Audit data excludes passwords/hashes, reset and login codes, tokens, contact
information, shipping addresses, review text, upload URLs, and arbitrary request
bodies. The API exposes no edit/delete operations for audit entries. Existing
database access still permits direct changes; this is an application audit trail,
not tamper-proof external storage.

Historical labels are retained. Recognized old login/reset entries receive a
type and a historical description; actor names/roles are backfilled from current
user records where available. Missing old values and sign-in methods cannot be
reconstructed. Raw SQL/ExecuteUpdate operations and fields outside the explicit
allowlist do not create automatic domain entries. Failed sign-in attempts are
not included in this change.

Validation: `python tests/FeatureFlows/run.py` tests permissions, filters, paging,
record IDs, actor attribution, before/after values, privacy and atomic rollback,
plus the admin UI in Chromium. See `tests/FeatureFlows/README.md` for prerequisites.

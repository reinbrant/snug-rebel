# Customer authentication verification — 2026-11-05

Verified against the configured Neon database using temporary accounts, bags, catalog entries, and orders. No schema migration is required. Collections were removed from application code and endpoints; existing database tables and migration history were preserved.

## API regression checks

Run the development API, then `python3 scripts/verify_customer_auth.py`. The script requires the same Neon access and `psql` setup as the admin suite, and cleans up its generated fixtures in `finally`.

- Registration validates email, required names, an eight-character minimum password, and the BCrypt 72-byte limit; phone is optional.
- Email normalization and duplicate-email conflicts.
- Immediate session creation after registration; safe profile responses contain no password hashes.
- Login failure/success and server session restoration.
- Guest bag transfer, repeated-login merge with an existing account bag, quantity edits, and revocation of the former guest token.
- Anonymous and cross-account attempts to read or mutate customer bags, orders, and checkout are rejected.
- Checkout links the order to the authenticated customer; own order history excludes other accounts.
- Role changes and account deactivation invalidate stale privileges; inactive accounts cannot log in.
- Logout revokes the cookie session and account access.
- Collection endpoint returns 404.

`python3 scripts/verify_admin.py` also passed again against the updated API, covering the remaining admin catalog, image/model uploads, inventory, orders, shipping, dashboard, and customer queries.

## Chromium checks

Used Playwright with system Chromium and the running React frontend/backend:

- Protected account route, navigation account icon, registration validation, show-password control, automatic sign-in, and HttpOnly session persistence after reload.
- Guest bag retained after registration; logout starts an empty guest bag; logging back in merges a new guest bag with the saved account bag.
- Signed-in checkout prefills customer name/email; API checkout creates an order visible in account history and linked to public tracking.
- Invalid login and duplicate registration display server errors.
- Return to checkout after sign-in; external redirect destinations are rejected.
- Failed logout keeps the account signed in and displays the error.
- Logout propagates between open storefront tabs.
- Responsive account forms and compact mobile navigation, including visible/reachable account, cart, logo, and navigation controls.
- Admin login still works; Collections is absent from navigation; its old route redirects to the dashboard.
- No uncaught page exceptions during these flows.

Backend, admin, and storefront builds passed. Frontend lint passed; admin lint passed with its existing React warnings. Existing backend package-resolution / Microsoft.OpenApi advisory warnings remain. No deployment was performed.

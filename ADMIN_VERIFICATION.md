# Admin verification — 2026-11-05

Verified against the configured Neon database, using temporary records that were removed afterward. The existing schema contained the required tables; no schema migration or bulk data update was applied. Default `One size` and `Standard` lookup entries support products without options.

## Automated API checks

Reproduce with `python3 scripts/verify_admin.py` while the development API is running.

- Login failure/success, customer rejection from admin endpoints, HttpOnly cookie session, logout, and protected product writes/reads.
- Categories: create, update, duplicate conflict, and deletion protection while assigned to products.
- Collections: create, edit, date-only launch dates, and delete.
- Images: upload, reject unsupported type, serve image bytes, persist `product_images`, primary selection, replace image lists, and retain existing rows after a failed save.
- Products: create/edit, stock/zero price override persistence, four independent size/color combinations, invalid foreign-key/variant ownership validation, and deactivation.
- Transaction rollback after SKU conflict; a failed update preserves product name, stock, and image records.
- Cart: optionless items, exact variant selection, stock limits, rejection of unavailable options, and no inventory creation during purchases.
- 3D models: upload/list/edit/delete, serve GLB bytes, and save previews in `product_images`.
- Direct checkout preserves the normal cart, uses configured inventory, and produces real order detail rows.
- Order listing/status/details, shipment creation, public tracking/history, live dashboard analytics/activities, and customer queries without password fields.

## Chromium checks

Exercised the running React admin and storefront with Playwright and system Chromium:

- Protected routes, email login/logout, session restoration after reload, and persistent theme.
- Dashboard CSV export, shipment report download, Day/Week/Month selection, and shipment navigation.
- Category/collection creation, editing, collection deletion, and visible category-in-use errors.
- Product creation/editing/reload, image upload/display, inventory persistence, and deactivation.
- All four size/color toggle combinations survive saves and appear correctly in the storefront; an item without options can be added to the bag.
- Simulated server conflict keeps the product editor open and displays the error.
- Order details, shipment form, and persisted shipment/tracking history.
- 3D upload/list/delete and preview images surviving subsequent product edits.
- No uncaught page exceptions during these flows.

## Build checks and limits

Backend, admin, and storefront builds passed. Both frontend lint commands passed without errors. Existing warnings remain for backend package resolution / the Microsoft.OpenApi advisory and two admin React lint warnings. The configured Cloudinary credentials were absent, so upload verification exercised local storage; the external Cloudinary service was not tested. Production must use configured Cloudinary or durable upload storage. No deployment was performed.

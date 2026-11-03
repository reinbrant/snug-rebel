# Changes in `feature/rein/frontend/cart-feature` vs `staging`

Both branches were compared file by file from their Repomix exports. Text files only: binary assets (PNG and similar) are not in the exports, so any change to them can't be seen here.

## Summary

The branch adds a working shopping cart. It touches 15 existing files, adds 21 new ones, and removes nothing.

- **Frontend:** a slide-out cart drawer, a global cart state, a cart API layer that can run against either the real backend or mock data, and add-to-cart buttons that now do something.
- **Backend:** the cart endpoints now return full item details, accept a product and size instead of a raw variant ID, and can switch an item to a different size or color. The product endpoints return real sizes and colors.
- **Also included:** a database migration and a variant-seeding endpoint.

| Area | Existing files modified | New files |
|---|---|---|
| Backend | 4 | 4 (1 controller, 3 migration files) |
| Frontend | 11 | 17 |

**Things to review before merging are listed in [Risks and review notes](#risks-and-review-notes).** The two most important are that mock data is used unless `VITE_USE_MOCK_API` is set to exactly `false` (and `.env` files aren't shared through the repo), and that a migration was added although `Program.cs` uses `EnsureCreated()`.

---

## 1. Backend

### 1.1 `Controllers/CartController.cs` (modified)

**What changed**

1. **New `QueryCartWithDetails()` helper.** It loads each cart with its items, variants, products, product images, colors and sizes. `GET /Cart/user/{id}`, `GET /Cart/session/{token}` and `POST /Cart/add` all use it. Before, they loaded only the bare `CartItems`.
2. **`POST /Cart/add` accepts a product and size.** The request can now carry `productId` and `size`. The old `productVariantId` still works.
3. **New `ResolveVariantAsync()`.** It finds the variant for a (product, size) pair and creates it the first time that size is added. If no size is given, it uses the product's first size, or `S`.
4. **Stock check on add.** Adding more than the variant's stock returns `409 InsufficientStock`.
5. **New cart item ID.** Items now get the ID `"c-item" + 32 hex characters`.
6. **`PUT /Cart/item/{id}` can switch variants.** It now accepts `size` and `color` as well as `quantity`. The new `ResolveVariantChangeAsync()` finds the target variant. If the cart already holds that exact variant, the two lines merge. Stock is checked after the merge.
7. **Stock check on quantity update.** Raising a quantity above stock returns `409`.
8. **`MapToCartDto` returns display data.** Each item now includes product ID, name, image URL, unit price, color, size and stock.
9. **The 500 error response no longer includes the stack trace** in the quantity-update endpoint.

**Why**

- **Items 1 and 8:** the cart drawer has to show names, images, prices and options. The old response was only IDs and quantities, so the frontend couldn't render a bag.
- **Items 2 and 3:** the shop cards and the product page only know a product ID and a size. They don't know variant IDs. Letting the backend find or create the variant means products don't need hand-made variant rows before they can be bought.
- **Item 5:** a code comment explains this. The database's default ID was 42 characters and the column holds 40. Because the ID is now set in code, EF Core would try an UPDATE on a new row, so the item is added through the `DbSet` to force an INSERT.
- **Items 4 and 7:** the cart should refuse quantities the stock can't cover.
- **Item 6:** the cart drawer's new size and color dropdown needs a backend call to change an item's options.
- **Item 9:** stack traces shouldn't be sent to clients. See the review notes, because the other cart endpoints still do this.

### 1.2 `DTO/CartDTO.cs` (modified)

- `CartItemDTO` gains the display fields: `ProductId`, `ProductName`, `ImageUrl`, `UnitPrice`, `ColorName`, `SizeLabel`, `StockQuantity`.
- `CartItemRequest` and `AddToCartRequest` gain `ProductId` and `Size`. `ProductVariantId` becomes optional.
- `UpdateCartItemRequest.Quantity` becomes nullable, and `Size` and `Color` are added.

**Why:** these are the request and response shapes the controller changes above need. `Quantity` is nullable so a request can change only the size or color.

### 1.3 `Controllers/ProductController.cs` (modified)

- **List endpoint:** now sets `SalePrice`, `Rating`, `ReviewCount`, `SoldCount`, `StockLeft` and `Badge` explicitly to placeholder values (null, 5, 0, 0, null, null).
- **Detail endpoint (`GetProductById`):**
  - Now loads the product's variants with their colors and sizes.
  - Builds the size list from the standard sizes `S, M, L, XL`, plus any other size that already has a variant. A size is marked unavailable only if its variant exists with zero stock.
  - Builds the color list from the product's active variants, falling back to a single `Standard` color.
  - `Stock` is now the sum of variant stock, or 10 if there are no variants.
  - Rating, review count, sold count and sale price are also set explicitly.
  - The fixed `Standard` color and `S/M/L/XL` size lists are gone.

**Why:** the size and color options on the product page, and in the cart drawer's dropdown, should reflect what the product actually has. Variant rows are created lazily, so the standard sizes are always offered. The explicit placeholders keep the response complete for the frontend until real review and rating data exists.

### 1.4 `DTO/ProductDTO.cs` (modified)

- `ProductListDTO` gains `DefaultVariantId`.
- `ProductDetailDTO` gains `Variants`.
- New record `VariantDTO(Id, Color, Size, Stock, PriceOverride)`.

**Why:** these mirror the frontend types, so the product page can know which variants exist. **Neither `DefaultVariantId` nor `Variants` is filled in by `ProductController`.** See the review notes.

### 1.5 `Controllers/ProductVariantController.cs` (new)

- `POST /api/ProductVariant` creates one variant from an explicit request.
- `POST /api/ProductVariant/seed-defaults?stock=50` gives every active product with no variants a default set (S, M, L, XL in the first color, 50 in stock). It is safe to call repeatedly.

**Why:** a one-off helper so existing products can be added to a cart without manually creating variants.

### 1.6 `Migrations/` (new)

Three files: `20261103011651_InitialCreate.cs`, its `.Designer.cs`, and `AppDbContextModelSnapshot.cs`. The initial migration creates the whole schema, including the Postgres enums (address type, discount type, order status, payment method and payment status).

**Why:** puts the database schema under EF Core migration control. This is not strictly cart work, so check it is intended. See the review notes.

---

## 2. Frontend: cart system (all new unless noted)

### 2.1 `api/api.ts` (modified)

- New `ApiError` class carrying the HTTP status, the backend's error code and its readable message. Status `0` means the server couldn't be reached.
- `apiFetch` now builds headers with `Headers`, tolerates empty response bodies, and strips a trailing slash from `VITE_API_URL`.

**Why:** the cart needs to show the backend's own messages ("Only 3 in stock") and tell a 404 (empty cart) apart from a network failure. The old code threw a generic error with only the status.

### 2.2 `api/cart.types.ts`, `cart.ts`, `cart.http.ts`, `cart.mock.ts`

- **`cart.types.ts`:** the `Cart`, `CartLine`, `CartOwner`, `CartTarget` and `VariantChange` types, plus `EMPTY_CART`.
- **`cart.http.ts`:** the real implementation. It calls the backend to fetch, add, update, switch variant, remove and clear. A 404 on fetch is treated as an empty cart.
- **`cart.mock.ts`:** a fake backend for development. It keeps the cart in `localStorage` and falls back to memory if storage is unavailable. It adds a short artificial delay, enforces stock limits, and behaves like the real backend, including merging lines on a variant switch.
- **`cart.ts`:** picks `http` or `mock` once, when the app loads, and re-exports the same functions either way. It picks `http` only when `VITE_USE_MOCK_API` is exactly `'false'`. Any other value, or no value, gives `mock`. See [Risks and review notes](#risks-and-review-notes) item 1.

**Why:** the UI is written against one interface, so it works whether or not the backend is running. This follows the pattern the project already used for item data.

### 2.3 `api/session.ts`

Creates and remembers a guest session token in `localStorage`, falling back to a fixed guest token if storage is blocked.

**Why:** guests have no account, so their cart is tied to this token. The code notes this should switch to `{ userId }` once login exists.

### 2.4 `context/cartContext.ts` and `context/CartProvider.tsx`

- A global cart store exposed through a `useCart()` hook: the lines, item count, subtotal, load status, error, a `busy` flag, and open/close state for the drawer.
- Actions: `addItem`, `setQuantity`, `changeVariant`, `removeLine`, `clear`, `refresh` and `dismissError`.
- Each change refetches the cart afterwards, so the UI always shows the server's version.
- The provider tracks in-flight requests with a counter. This is what drives `busy`.

**Why:** the cart is needed in three places: the nav bar badge, the drawer, and the add buttons on pages. A shared provider means they always agree.

### 2.5 `App.tsx` (modified)

Wraps the router in `<CartProvider>`.

**Why:** makes the cart available to every page.

### 2.6 `layouts/RootLayout.tsx` (modified)

- Reads `isOpen`, `openCart`, `closeCart` and `itemCount` from the cart.
- Passes the cart state and count to the nav bar, and opens or closes the drawer when the cart icon is toggled.
- Renders `<CartDrawer />` on every page.

**Why:** connects the nav bar's cart icon to the drawer.

### 2.7 `components/nav/NavBar.tsx` (modified)

- New props `cartOpen` and `cartCount`.
- The cart button's highlight follows `cartOpen`, and its accessible label includes the item count.
- A red count badge sits on the cart icon and shows `99+` above 99.
- **The diff for this file is large mostly because the whole file was reformatted.** Single quotes, no semicolons and two-space indent became double quotes, semicolons and tabs. The functional change is only the points above.

**Why:** the badge shows how many items are in the bag at a glance.

### 2.8 `components/shop/CartDrawer.tsx` (new)

A slide-out bag panel.

- **Layout:** a "Your Bag" header, a scrolling list of items, and a subtotal with a checkout button.
- **Item rows:** image, name (links to the product), the option tag, price, a quantity stepper (decrease, count, increase) and a delete button.
- **Safety:** removing an item, or pressing "−" at quantity 1, opens a confirmation dialog before deleting. The "+" button is disabled at the stock limit. Controls are disabled while a request is in flight.
- **States:** a loading state, an empty state with a Shop button, and an error banner with Dismiss.
- **Closing:** the drawer slides out on close, and closes on Escape, a backdrop click, or navigation. While the confirm dialog is open, Escape closes only the dialog.
- **Header position:** the header was lowered (`pt-20`) so it clears the X button, centered with `mx-auto`, and nudged left with `-translate-x-3`. The text position is tunable through the `HEADER_TEXT` constant (`top: 12`, `fontCqw: 10`).
- **Width:** `max-w-xl` (576px).
- **Checkout button:** it closes the drawer but doesn't go anywhere yet. The code has a comment saying to navigate when the route is ready.

### 2.9 `components/shop/CartVariantPicker.tsx` (new)

The "Standard, S" tag on each cart line, now a dropdown.

- It opens a panel with size chips and color chips (with swatches). Out-of-stock sizes are struck through and disabled.
- A pick applies immediately and the panel stays open until Done, Escape or a click outside.
- The options are loaded from the product endpoint when the panel opens.
- The panel is rendered in a portal and positioned from the tag, so the scrolling list doesn't clip it. It flips above the tag when there's no room below.

**Why:** shoppers can change size or color without removing and re-adding the item.

### 2.10 `components/shop/ConfirmDeleteDialog.tsx`, `components/ui/DialogButton.tsx`, `components/ui/ShopButton.tsx` (new)

- **`ConfirmDeleteDialog`:** a centered "are you sure" dialog over a dimmed screen. Clicking outside, pressing Escape or choosing "No" cancels, and focus starts on "No" so an accidental Enter never deletes.
- **`DialogButton`:** the Yes/No buttons in a torn-paper shape. Light and dark variants swap colors on hover.
- **`ShopButton`:** the "Shop" button in the empty-bag state, a hand-cut SVG outline.

### 2.11 Cart SVG assets

New: `cart_header_container.svg`, `cart_x_button_container_state0.svg`, `cart_x_button_container_state1.svg`, `checkout_button_container_state1.svg`, `confirmation_dialog_container.svg`.

Modified: `checkout_button_container_state0.svg`. The mask ID changed and a path was added (it appears to contain the "Check out" text).

**Why:** the drawer's header, close button, checkout button and dialog are image-based. The two states of each button cross-fade on hover.

### 2.12 `index.css` (modified)

- Imports the Roboto Serif font and registers it as `--font-serif-wide`, for the checkout button.
- Adds four animations: `cart-in`, `cart-out`, `cart-fade-in` and `cart-fade-out`.

**Why:** the drawer slide and the backdrop fade. A comment notes that `--animate-cart-out`'s 250ms must stay in sync with `CLOSE_MS` in `CartDrawer.tsx`.

---

## 3. Frontend: shop and product pages (all modified)

### 3.1 `pages/ItemDetail.tsx`

- "Add to Bag" and "Buy Now" now call `addItem({ productId, size }, quantity)` and open the drawer on success. Before, they only logged to the console.
- Both buttons are disabled while a request is in flight, or if no size is selected.
- The sale check changed from `salePrice !== undefined` to `salePrice != null`.

**Why:** makes the buttons work. The sale fix is needed because the backend sends `salePrice: null`. With the old check, `null !== undefined` and `null < price` are both true, so every item showed as 100% off at ₱0.00.

**Note:** "Buy Now" currently does exactly what "Add to Bag" does. The selected color is not sent.

### 3.2 `pages/ShoppingPage.tsx`

- The card buttons now call `addItem({ productId })`, so the backend picks the default size, then open the drawer. Before, they logged to the console.
- The data-loading effect was reformatted.

### 3.3 `components/shop/ShopItemCard.tsx`

- The sale check changed to `salePrice != null`. This is the same fix as in `ItemDetail.tsx`.
- **The doc comments on the props were deleted.**

### 3.4 `api/items.ts`

- Adds mock mode: `getItem` returns mock data unless `VITE_USE_MOCK_API` is exactly `'false'`.
- New `ItemVariant` type, an optional `variants` list on `ItemDetail`, and mock-variant builders and lookups (`findMockVariant`, `findMockVariantBySize`). The mock products have three colors and five sizes.
- **Reviews:** `MOCK_REVIEWS` was cut from 9 reviews to 2.
- **The header comment and the doc comments on the types and functions were removed.**

### 3.5 `data/products.ts`

- Adds `defaultVariantId` to the `Product` type and a `MOCK_PRODUCTS` list of 8 products.
- `getProducts` returns the mock list unless `VITE_USE_MOCK_API` is exactly `'false'`.
- **Removed:** the large commented-out `PRODUCTS` example list and the doc comment on `CATEGORIES.sidebar`.

---

## Risks and review notes

1. **Mock vs real API is set by an environment variable, and mock is the fallback.**

   *How it works.* `items.ts` and `products.ts` use mock data unless `VITE_USE_MOCK_API` is exactly the string `'false'`. `cart.ts` uses the real backend only when it is exactly `'false'`. Unset, empty, `False`, `FALSE` and `false ` (trailing space) all give mock mode. On staging, products and items always came from the real API, so this is a change in default behavior.

   *Current local setup.* Per the branch author, the frontend `.env` has `VITE_USE_MOCK_API=false` and `VITE_API_URL=http://localhost:5146/api`, so the real API is used. The `.env` file itself is not in the repo or in the exports, so this was not checked against the files. The value fits the repo:
   - Port `5146` matches the backend's `http` profile in `launchSettings.json` (`http://localhost:5146`).
   - The `/api` suffix matches the controllers' `[Route("api/[controller]")]`. The frontend adds paths like `/Cart/...` and `/Product/ProductList` after `VITE_API_URL`, so the full URL is `http://localhost:5146/api/Cart/...`.

   *Staging is not wired up yet.* `https://snug-rebel-staging.onrender.com/api` does not appear anywhere in the repo, and its `.env` has not been updated. When it is, the deployed backend needs to be updated first, or the cart will fail against it. The branch changes the cart request and response shapes, adds the size and color switching on `PUT /Cart/item/{id}`, changes the product detail endpoint, and adds a migration and the variant-seeding endpoint. The backend's `Cors:AllowedOrigins` setting (read in `Program.cs`) also has to include the frontend's origin.

   *Who is affected.* `frontend/.gitignore` excludes `.env`, so this setting is not shared through the repo. A teammate who clones the branch without creating a `.env`, or a deployment that doesn't set the variable, will show mock products and a cart stored in the browser (`localStorage`) with no error. The only related mention in the repo is `VITE_API_URL` in `API_ENDPOINTS.md`. Nothing documents `VITE_USE_MOCK_API`, and there is no `.env.example`.

   *Suggested fixes.*
   - Add a `frontend/.env.example` with `VITE_USE_MOCK_API=false` and `VITE_API_URL=http://localhost:5146/api`, and mention both in the README.
   - Optionally make mock mode opt-in with `import.meta.env.VITE_USE_MOCK_API === 'true'` in all three files, so a missing variable means the real API.

2. **A migration was added while `Program.cs` still calls `EnsureCreated()`.** `Program.cs` is unchanged. `EnsureCreated()` builds the schema without creating the migrations history table, so a later `dotnet ef database update` on a database it created will fail with "already exists". Staging also has SQL scripts and a `MINIMAL_MIGRATION_GUIDE.md` for setting up the database. Decide whether migrations or `EnsureCreated()` is the source of truth, and keep the migration in this branch only if that is intended.

3. **`ProductVariantController` has no authentication.** Anyone can create variants or run `seed-defaults`. Restrict it, or remove it once products have variants.

4. **`DefaultVariantId` and `ProductDetailDTO.Variants` are never filled in by the backend.** The frontend types expect them, and the mock mode fills them, so mock mode and the real API behave differently. In real mode the cart works anyway, because it uses product and size, not variant IDs.

5. **Stack traces are still returned by other cart endpoints.** Only `PUT /Cart/item/{id}` stopped returning `stackTrace` on a 500. Five references remain in `CartController.cs`.

6. **The cart ignores sale prices.** The cart's unit price comes from `PriceOverride ?? BasePrice`. This is consistent today, because the backend always sends `SalePrice = null`. Once real sale prices exist, the cart must use them too, or it will charge more than the shop card shows.

7. **`ShopItemCard`'s `salePrice` type is still `number`**, while the backend sends `null`. The runtime fix is in, but changing the types to `number | null` would let TypeScript catch this next time.

8. **Comment and content removals unrelated to the cart.** Doc comments were deleted from `ShopItemCard.tsx`, `items.ts`, `products.ts` and `RootLayout.tsx`. The commented-out example product list in `products.ts` was deleted. Seven of the nine mock reviews were deleted. These look like side effects of editing and reformatting. Restore them if they weren't intentional.

9. **Whole-file reformatting makes some diffs noisy.** `NavBar.tsx` changed from single quotes and no semicolons to double quotes, semicolons and tabs. The `ShoppingPage.tsx` effect was also reindented. Consider a formatter config so future diffs show only real changes.

10. **Unfinished behavior:**
    - The checkout button only closes the drawer.
    - "Buy Now" behaves like "Add to Bag".
    - The selected color on the product page is not sent to the cart.
    - Guest carts are not merged into a user cart on login. The backend has a `MergeCartRequest` type but no endpoint for it in this branch.

# Snug Rebel Backend API Reference

Base URL for local development:

- `http://localhost:5146` when the backend is running in the local dev environment
- or the configured Vite/API origin used by the frontend

All controllers are mounted under `/api`.

Example:

- `GET /api/Product`
- `POST /api/Auth/register`
- `GET /api/Cart/user/{userId}`

---

## 1. Auth

Controller: `AuthController`
Route base: `/api/Auth`

### `POST /api/Auth/register`
Creates a pending customer account, sends a verification email, and returns HTTP 202 without signing in. New accounts must verify their email before login. Existing accounts retain access. Passwords must contain at least 8 characters and at most 72 UTF-8 bytes. `phoneNumber` is optional. Login accepts an optional `sessionToken` to transfer or merge a guest bag into the account after verification. The guest token is cleared from the transferred cart.

Request body:

```json
{
  "email": "hello@example.com",
  "password": "StrongPass123!",
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+639171234567"
}
```

Response (HTTP 202):

```json
{
  "verificationRequired": true,
  "email": "hello@example.com",
  "message": "Check your email to verify your account before signing in."
}
```

Notes:

- Email is normalized to lowercase before saving.
- Password is hashed server-side.
- `PasswordHash` is intentionally not returned to the frontend.

### `POST /api/Auth/login`
Authenticates a user, sets an HttpOnly session cookie, and returns the safe account profile. Send `credentials: 'include'` from browser clients for all account requests. Correct credentials for an account awaiting verification return 403 with `error: "EmailNotVerified"`. Safe profile responses also include `emailVerified`.

Request body:

```json
{
  "email": "hello@example.com",
  "password": "StrongPass123!"
}
```

Response:

```json
{
  "pkUserId": "usr_...",
  "userEmail": "hello@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+639171234567",
  "role": "Customer",
  "isActive": true,
  "emailVerified": true
}
```

---

### `POST /api/Auth/resend-verification`
Accepts `{ "email": "hello@example.com" }` and returns a generic HTTP 202 response. Pending accounts receive a replacement code and link, at most once every 60 seconds. See [email verification setup](../EMAIL_VERIFICATION.md) for delivery configuration and limits.

### `POST /api/Auth/verify-email-code`
Accepts `{ "email": "hello@example.com", "code": "012345" }`. Verifies an active pending customer and returns 200 without a session. Invalid, expired, consumed, or locked codes return 400 / `InvalidCode`.

### `POST /api/Auth/request-login-code`
Accepts `{ "email": "hello@example.com" }`. Returns a generic 202; only active customer accounts receive a code. No account is created. Unknown/inactive/admin/staff addresses, cooldowns, and provider failures have the same response. Missing provider configuration returns 503.

### `POST /api/Auth/login-code`
Accepts `{ "email": "hello@example.com", "code": "012345", "sessionToken": "optional-guest-token" }`. Consumes a sign-in code, verifies the email if needed, merges the guest bag, and sets the same session cookie/profile as password login. Invalid codes return 400 / `InvalidCode`. Admin/staff accounts cannot use this endpoint.

Codes expire in 10 minutes, permit five attempts, and are single-use. Codes for verification and sign-in have separate purposes. Sends have a 60-second account/purpose cooldown. Send endpoints share 20 requests/minute/IP; confirmations share 30. See [setup and security behavior](../EMAIL_VERIFICATION.md).

### `POST /api/Auth/verify-email`
Accepts `{ "token": "..." }` and consumes a valid single-use token. Returns 200 after verification, or 400 for invalid, expired, replaced, or used tokens. The customer must then sign in normally. Links expire after one hour.

### `GET /api/Auth/session`
Returns the current active account profile, or 401 when signed out or inactive. Roles and account status are checked against the database on authenticated requests.

### `POST /api/Auth/logout`
Expires the session cookie; returns 204. A failed logout must leave the frontend signed in.

### Customer ownership

`GET /api/Order/mine` requires a session and returns only that account's orders. Account cart reads/writes and checkout require the matching authenticated user ID; other accounts cannot access them. Guest carts remain supported. Guest cart item updates, removal, and clearing require `X-Cart-Session` with the owning guest token. Collection endpoints have been removed; `SQL/remove_collections.sql` removes the legacy database tables when run manually.

---

## 2. Product catalog

Controller: `ProductController`
Route base: `/api/Product`

### `GET /api/Product`
Returns all products in the database.

### `GET /api/Product/ProductList`
Returns the lightweight product listing shape for storefront cards.

Response shape:

```json
[
  {
    "id": "prd_...",
    "name": "Oversized Tee",
    "imageSrc": "https://.../image.jpg",
    "price": 1299.00,
    "salePrice": null,
    "rating": 5.0,
    "reviewCount": 40,
    "soldCount": 120,
    "stockLeft": 15,
    "badge": "New",
    "categories": ["ctg_..."]
  }
]
```

### `GET /api/Product/{id}`
Returns a product detail object for a single product.

Example:

```http
GET /api/Product/prd_123
```

Response:

```json
{
  "id": "prd_123",
  "name": "Oversized Tee",
  "description": "Heavyweight cotton ...",
  "imageSrc": "https://.../image.jpg",
  "price": 1299.00,
  "salePrice": null,
  "rating": 5.0,
  "reviewCount": 40,
  "soldCount": 120,
  "stock": 10,
  "colors": [
    { "name": "Standard", "hex": "#000000" }
  ],
  "sizes": [
    { "label": "S", "available": true },
    { "label": "M", "available": true }
  ]
}
```

### `POST /api/Product`
Creates a product.

Request body:

```json
{
  "displayId": "PRD-1001",
  "slug": "oversized-tee",
  "productName": "Oversized Tee",
  "fkCategoryId": "ctg_123",
  "description": "Premium oversized tee",
  "basePrice": 1299.00,
  "material": "100% cotton",
  "isActive": true
}
```

### `PUT /api/Product/{id}`
Updates an existing product.

### `DELETE /api/Product/{id}/deactivate`
Soft-deactivates a product by setting `IsActive` to `false`.

Legacy compatibility routes still exist for older frontend calls:

- `GET /api/Product/GetProducts`
- `GET /api/Product/GetProductByID/{id}`
- `POST /api/Product/CreateProduct`
- `PUT /api/Product/UpdateProduct/{id}`
- `DELETE /api/Product/DeactivateProduct/{id}`

---

## 3. Category

Controller: `CategoryController`
Route base: `/api/Category`

### `GET /api/Category`
Returns all categories.

### `GET /api/Category/{id}`
Returns one category.

### `POST /api/Category`
Creates a category.

Request body:

```json
{
  "categoryName": "Streetwear",
  "slug": "streetwear",
  "description": "Everyday elevated essentials",
  "isActive": true,
  "fkParentCategoryId": null
}
```

### `PUT /api/Category/{id}`
Updates a category.

### `DELETE /api/Category/{id}`
Deletes a category if it is not assigned to products.

---

## 5. Color

Controller: `ColorController`
Route base: `/api/Color`

### `GET /api/Color`
Returns all available colors.

### `GET /api/Color/{id}`
Returns one color by ID.

### `POST /api/Color`
Creates a color.

Request body:

```json
{
  "name": "Midnight Black",
  "hexCode": "#101010"
}
```

### `PUT /api/Color/{id}`
Updates a color.

### `DELETE /api/Color/{id}`
Deletes a color if it is not in use by product variants.

---

## 6. Size

Controller: `SizeController`
Route base: `/api/Size`

### `GET /api/Size`
Returns all sizes ordered by `sortOrder`.

### `GET /api/Size/{id}`
Returns one size.

### `POST /api/Size`
Creates a size.

Request body:

```json
{
  "label": "XL",
  "sortOrder": 4
}
```

### `PUT /api/Size/{id}`
Updates a size.

### `DELETE /api/Size/{id}`
Deletes a size if it is not assigned to a variant.

---

## 7. Cart

Controller: `CartController`
Route base: `/api/Cart`

### `GET /api/Cart/user/{userId}`
Returns a cart associated with a user.

### `GET /api/Cart/session/{sessionToken}`
Returns a cart associated with a guest session.

### `POST /api/Cart/add`
Adds one or more items to a cart.

Request body with single item:

```json
{
  "userId": "usr_123",
  "sessionToken": null,
  "productVariantId": "prd-var_456",
  "quantity": 2
}
```

Request body with multiple items:

```json
{
  "userId": "usr_123",
  "items": [
    { "productVariantId": "prd-var_456", "quantity": 1 },
    { "productVariantId": "prd-var_789", "quantity": 2 }
  ]
}
```

Response:

```json
{
  "pkCartId": "cart_abc",
  "fkUserId": "usr_123",
  "sessionToken": null,
  "items": [
    {
      "pkCartItemId": "c-item_1",
      "fkCartId": "cart_abc",
      "fkProductVariantId": "prd-var_456",
      "quantity": 2
    }
  ],
  "totalItems": 2
}
```

### `PUT /api/Cart/item/{cartItemId}`
Updates the quantity of a cart item.

Request body:

```json
{
  "quantity": 3
}
```

If quantity is `<= 0`, the item is removed instead.

### `DELETE /api/Cart/item/{cartItemId}`
Removes a specific cart item.

### `DELETE /api/Cart/{cartId}/clear`
Empties a cart.

---

## 8. Order

Controller: `OrderController`
Route base: `/api/Order`

### `GET /api/Order/user/{userId}`
Returns all orders for a user.

### `GET /api/Order/{orderId}`
Returns one order by ID.

### `POST /api/Order/checkout`
Creates an order from the user cart.

Request body:

```json
{
  "userId": "usr_123",
  "cartId": "cart_abc",
  "shippingAddressId": "adr_456",
  "billingAddressId": "adr_789",
  "shippingFee": 120.00,
  "customerNote": "Leave at the front gate"
}
```

Validation:

- `userId` is required
- `shippingAddressId` is required
- `shippingFee` cannot be negative
- cart must not be empty
- stock must be sufficient per product variant

Response:

```json
{
  "pkOrderId": "ord_123",
  "orderNumber": "ORD-20261028-ABCD1234",
  "fkUserId": "usr_123",
  "fkShippingAddressId": "adr_456",
  "fkBillingAddressId": "adr_789",
  "subtotal": 2598.00,
  "discountAmount": 0.00,
  "shippingFee": 120.00,
  "totalAmount": 2718.00,
  "customerNote": "Leave at the front gate",
  "placedAt": "2026-10-28T12:10:00Z",
  "updatedAt": "2026-10-28T12:10:00Z",
  "items": [
    {
      "fkProductVariantId": "prd-var_456",
      "productName": "Oversized Tee",
      "sku": "SKU-001",
      "sizeLabel": "M",
      "colorName": "Black",
      "unitPrice": 1299.00,
      "quantity": 2,
      "lineTotal": 2598.00
    }
  ]
}
```

---

## 9. Payment

Controller: `PaymentController`
Route base: `/api/Payment`

### `POST /api/Payment/process`
Processes payment for an order.

Request body:

```json
{
  "orderId": "ord_123",
  "method": "Gcash",
  "providerReference": "ref_abc123"
}
```

Accepted enum-style values:

- `Cod`
- `Gcash`
- `Maya`
- `Card`
- `BankTransfer`

On success, the order status is set to `Paid` and a payment record is created.

---

## 10. Review

Controller: `ReviewController`
Route base: `/api/Review`

### `GET /api/Review/product/{productId}`
Returns all reviews for a product.

### `GET /api/Review/user/{userId}`
Returns all reviews written by a user.

### `POST /api/Review`
Creates a review.

Request body:

```json
{
  "productId": "prd_123",
  "userId": "usr_456",
  "orderItemId": "o-item_789",
  "rating": 5,
  "body": "Very comfortable and good fit."
}
```

Validation:

- rating must be between `1` and `5`
- product, user, and order item must exist

### `DELETE /api/Review/{id}`
Deletes a review.

---

## 11. Promo code

Controller: `PromoCodeController`
Route base: `/api/PromoCode`

### `GET /api/PromoCode`
Returns all promo codes.

### `GET /api/PromoCode/{id}`
Returns one promo code.

### `POST /api/PromoCode`
Creates a promo code.

Request body:

```json
{
  "promocode": "SAVE10",
  "description": "10% off selected items",
  "discountValue": 10,
  "minOrderAmount": 1500.00,
  "maxUses": 100,
  "promoStart": "2026-10-28T00:00:00Z",
  "promoEnd": "2026-11-28T00:00:00Z",
  "isActive": true
}
```

### `PUT /api/PromoCode/{id}`
Updates a promo code.

### `DELETE /api/PromoCode/{id}`
Deletes a promo code.

---

## 12. Address

Controller: `AddressController`
Route base: `/api/Address`

### `GET /api/Address/user/{userId}`
Returns all addresses for a user.

### `POST /api/Address/create`
Creates a user address.

Request body:

```json
{
  "fkUserId": "usr_123",
  "recipientName": "Jane Doe",
  "line1": "123 Main Street",
  "line2": "Unit 5",
  "barangay": "San Antonio",
  "city": "Pasig",
  "province": "Metro Manila",
  "postalCode": "1600",
  "country": "PH",
  "phone": "+639171234567",
  "isDefault": true,
  "addressType": "Shipping"
}
```

### `DELETE /api/Address/{addressId}`
Deletes an address.

---

## Frontend request handling conventions

The frontend uses a single helper in [frontend/src/api/api.ts](../frontend/src/api/api.ts) to centralize API calls:

- `API_URL` comes from the environment variable `VITE_API_URL`.
- each request is sent as `fetch(`${API_URL}${endpoint}`, ...)`.
- the default request header is always `Content-Type: application/json`.
- any custom header values from the caller are merged on top of that default.
- if the HTTP response is not OK, the helper throws `new Error("API error: <status>")` instead of parsing a custom error payload.

This means the caller is responsible for interpreting status codes in its own data layer or UI component.

Typical frontend usage pattern:

```ts
import { apiFetch } from "../api/api";

const data = await apiFetch<MyType>("/Product/ProductList");
```

For non-GET calls, the caller adds `method` and `body` before passing to `apiFetch`:

```ts
await apiFetch("/Auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
```

A real example from the app is in [frontend/src/api/items.ts](../frontend/src/api/items.ts):

- `getItem(id)` calls `/Product/GetProductByID/${encodeURIComponent(id)}`
- when the server responds with a `404`, the UI treats it as a missing item and returns `null`
- other errors are re-thrown so the page can fail visibly instead of silently hiding a real problem

General frontend guidance for the team:

1. Use the centralized `apiFetch` helper for all API requests.
2. Keep the response models aligned with the server DTOs and the actual data the UI consumes.
3. Encode dynamic IDs with `encodeURIComponent` before appending them to a route.
4. Treat `404` as a domain-level “not found” case when the item or resource is expected to be missing.
5. For other error states, keep the UI logic explicit: show a message, fallback state, or retry flow.
6. For protected or user-specific flows, pass the current `userId` from app state instead of hardcoding IDs.
7. For guest carts, prefer `sessionToken` and keep the cart flow separate from authenticated-user cart logic.
8. Prefer the canonical route names above; legacy routes still work, but the new route names are the intended contract.

---

## Recommended frontend integration pattern

1. Use the `apiFetch` helper for all calls.
2. Keep the response models aligned with the server DTOs.
3. For protected/user-specific flows, pass the `userId` from the logged-in user state.
4. For guest carts, use `sessionToken` as the cart identifier.
5. Prefer the canonical route names above; legacy routes still work, but the new route-based names are the intended API contract.

---

## Important notes

- This API uses snake-case database names internally, but the HTTP contract is JSON-typed and primarily camel-cased in the DTOs.
- Errors are returned as structured JSON objects such as:

```json
{
  "error": "ProductNotFound",
  "message": "Product with ID 'prd_123' was not found."
}
```

- The application is configured to allow CORS from the frontend origin, typically `http://localhost:5173` in development.

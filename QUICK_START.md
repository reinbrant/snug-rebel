# Development with Neon

Requirements: .NET 10, Node.js 22.22 or newer, and npm.

1. Set deployment variables directly in Render and Vercel using [the variable list](ENVIRONMENT.md). For local development, export backend variables in your shell or use ignored `backend/appsettings.json` with `backend/appsettings.template.json` as a reference. Run `backend/SQL/email_verification.sql` followed by `backend/SQL/email_otp.sql` before using the updated backend, and follow [email verification setup](EMAIL_VERIFICATION.md) for free Brevo configuration.
2. Start the API from the repository root:

   ```bash
   dotnet run --project backend
   ```

3. In separate terminals, start the admin and storefront:

   ```bash
   npm --prefix admin ci
   npm --prefix admin run dev -- --port 5175
   ```

   ```bash
   npm --prefix frontend ci
   npm --prefix frontend run dev -- --port 5173
   ```

Open the admin at `http://localhost:5175` and sign in with an active Admin or Staff account. The storefront at `http://localhost:5173` uses the same API and Neon data. Mock mode requires an explicit `VITE_USE_MOCK_API=true`.

Product images can be uploaded or supplied as HTTPS URLs. The first image is primary. Save persists images and inventory together; edit a product to change them. Enable sizes and colors independently. Products without either option still have a SKU, stock, and optional price override. When disabling options on a product with multiple variants, remove entries that would create duplicate combinations. Removed variants are deactivated to retain historical references.

3D previews are also attached to `product_images`. If Cloudinary is configured, uploads use it. Without Cloudinary, uploads are served from `backend/wwwroot/uploads`; production must configure Cloudinary or persist that directory on durable storage. Uploaded files are excluded from Git.

For hosted environments, set `VITE_API_BASE_URL` for the admin and `VITE_API_URL` (including `/api`) for the storefront. Set the API's `Cors__AllowedOrigins__0`, etc. to the actual frontend origins. Admin requests use an HttpOnly session cookie; production requires HTTPS. Prefer admin/API domains under the same site to avoid browser restrictions on third-party cookies. No provider login is offered until OAuth is configured.

## Customer accounts

### Forgot password

Run `backend/SQL/password_reset.sql` after `backend/SQL/email_otp.sql` before
deploying password recovery. It adds the `password-reset` OTP purpose to the
existing database constraint and is safe to repeat. The existing Brevo email
settings also send reset emails; no additional provider variables are needed.

Customers can choose **Forgot password?** on `/sign-in`, receive a six-digit
email code, and set a new password at `/forgot-password`. Codes expire after
10 minutes, allow five attempts, and can be requested once per minute per
account. A completed reset invalidates existing sessions and outstanding
email sign-in codes. Unverified accounts still need email verification.
The session-version update also requires existing users to sign in again once
after deployment. Admin and staff recovery is outside this customer flow.

Run `python tests/FeatureFlows/run.py` for recovery and review regressions;
see `tests/FeatureFlows/README.md` for its local prerequisites.

The storefront account icon opens `/sign-in`, `/sign-up`, or `/account`. New customers must verify their email before signing in. Existing accounts retain access. Sessions use the backend's HttpOnly cookie; account data and passwords are not stored in browser local storage. Both the admin and customer frontend must send credentialed requests to the configured API.

A guest bag transfers into the customer account on sign-in after verification. If the customer already has a bag, matching variant quantities are combined; checkout continues to enforce available stock. Signing out starts a fresh guest bag and preserves the account bag for the next sign-in. Account checkout is associated with the server-validated customer, and the account page shows that customer's order history. Guest checkout is still available.

Collections have been removed from admin navigation, application models, and API endpoints. Run `backend/SQL/remove_collections.sql` in Neon to remove the retired tables and their rows. Products are preserved; historical migrations are retained.

## Verification

For the enhanced admin audit log, apply `backend/SQL/audit_log_details.sql`
before deploying the backend and admin frontend. See [audit history](AUDITING.md)
for supported action types, access rules, and validation.

```bash
dotnet build backend
npm --prefix admin run build
npm --prefix admin run lint
npm --prefix frontend run build
npm --prefix frontend run lint
```

See `ADMIN_VERIFICATION.md` and `CUSTOMER_AUTH_VERIFICATION.md` for historical checks. The one-off verification scripts have been removed.

# Email verification and passwordless sign-in

New customer registrations receive a verification email and stay signed out until verification succeeds. Existing customer, staff, and admin accounts keep their access. Existing email addresses are not marked as verified: the migration adds an explicit requirement flag, set only for new registrations.

## Provider choice

Brevo is the recommended free option for this app: it plugs into the existing PostgreSQL accounts and cookie sessions without an authentication migration. Brevo is the only supported email provider. Research checked on 2026-11-09:

| Provider | Free allowance / constraint | Fit here |
| --- | --- | --- |
| [Brevo](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans) | 300 emails/day on the Free plan | Email OTPs for verification and sign-in using the existing accounts. |
| [Firebase Authentication](https://firebase.google.com/docs/auth/limits) | Spark: 1,000 address verification emails/day, only 5 email-link sign-ins/day; SMS verification requires Blaze billing | Built-in link flows would require integrating Firebase identities and reconciling existing accounts; not the simplest fit for six-digit email codes here. |

Use Brevo's Free plan and do not enable paid upgrades or SMS. Sender/account approval and sender/domain authentication are still required by the provider; a free delivery quota does not include purchasing a domain. See [Brevo's sender setup](https://developers.brevo.com/docs/send-a-transactional-email). Provider acceptance does not guarantee inbox delivery; free quotas, queues and spam filtering can delay time-sensitive codes. No provider account, billing plan, or production configuration was changed by this implementation.

## Deploy

1. Run [backend/SQL/email_verification.sql](backend/SQL/email_verification.sql), then [backend/SQL/email_otp.sql](backend/SQL/email_otp.sql), in the Neon SQL Editor before deploying the backend. Both scripts are safe to repeat. They add the verification requirement, link hashes, and purpose-specific OTP challenges.
2. Create a free [Brevo](https://www.brevo.com/) account, complete sender/account approval and sender/domain authentication, then create an API key under SMTP & API. An API key is different from an SMTP key.
3. Add these backend environment variables (keep the API key out of frontend variables and Git):

   Set these directly in Render; see [the full deployment variable list](ENVIRONMENT.md).

   ```env
   Email__BrevoApiKey=your_brevo_api_key
   Email__From=Snug Rebel <accounts@yourdomain.com>
   Email__StorefrontUrl=https://your-storefront-domain.com
   ```

   `StorefrontUrl` must be the storefront's HTTPS origin, with no path, query, or fragment. Development also accepts HTTP localhost origins. The frontend must route `/verify-email` to its SPA entry point, as it does for `/sign-in`.

4. Redeploy the backend and storefront. Without valid email configuration, registration and requesting sign-in codes return 503; password sign-in continues to work for eligible accounts. Test one new account and one passwordless sign-in after configuring delivery.

Brevo is used automatically; no provider selector is needed. The API key is backend-only; no frontend environment variables or SDK dependencies are needed.

## Behavior

- Signup and unverified password sign-in open `/verify-email` with the email prefilled. Customers can also select **Already received a code? Enter verification code** on the sign-in page, or visit `/verify-email` directly. Successful verification shows **Continue to sign in** and preserves the original checkout destination.
- `POST /api/Auth/register` returns 202 with `{ "verificationRequired": true, "email": "...", "message": "..." }`, without setting a session cookie or transferring the guest bag.
- `POST /api/Auth/login` returns 403 / `EmailNotVerified` for correct credentials belonging to an account awaiting verification. Incorrect credentials still return 401.
- `POST /api/Auth/resend-verification`, with `{ "email": "..." }`, returns a generic 202 response for unknown, inactive, already verified, and pending accounts. Sends have a 60-second per-account cooldown. A successful resend invalidates the previous link and verification code; a delivery failure preserves both.
- `POST /api/Auth/verify-email`, with `{ "token": "..." }`, verifies an active pending account and consumes the token atomically. Invalid, expired, replaced, and already used tokens return 400.
- `POST /api/Auth/verify-email-code`, with `{ "email": "...", "code": "012345" }`, verifies an active pending customer without signing in. The verification email includes both the code and the existing link. Once verified through either method, the other method cannot be reused.
- `POST /api/Auth/request-login-code`, with `{ "email": "..." }`, returns a generic 202 response. Active customers receive a sign-in code. Unknown, inactive, admin, and staff addresses do not receive a code; the response is the same for cooldowns and delivery failures. This flow does not create accounts.
- `POST /api/Auth/login-code`, with `{ "email": "...", "code": "012345", "sessionToken": "optional-guest-token" }`, consumes a sign-in code, verifies the customer's email if necessary, merges the guest bag, and creates the same HttpOnly session as password sign-in. Verification codes cannot be used on this endpoint. Admin/staff login stays on its existing password flow.
- OTPs are six cryptographically random digits (including leading zeroes), expire after 10 minutes, and use salted BCrypt hashes. Each code permits at most five attempts, including the successful attempt. Failed attempts are committed; concurrent requests serialize with PostgreSQL row locks. A consumed code stays unusable; its row remains to enforce the send cooldown. Resending after 60 seconds replaces the challenge and resets attempts. Codes, email bodies and links must not be logged.
- Tokens contain 32 cryptographically random bytes, expire in one hour, and are stored only as SHA-256 hashes. Links use a URL fragment; the frontend removes it from history and requires a confirmation click, so simply fetching an email link does not consume it. Verification does not sign the user in.
- Registration, verification resend and login-code requests share 20 requests per minute per connection IP; all code/link confirmations share 30. Each account/purpose also has a database-enforced 60-second send cooldown and five-attempt limit. Multiple instances each enforce their own request limiter; the per-account resend cooldown is enforced in PostgreSQL. Deployment proxies may cause clients to share a connection IP.
- The guest bag stays available until the customer signs in after verification. The existing login flow then merges it into their account.
- Email delivery uses [Brevo's HTTPS API](https://developers.brevo.com/docs/send-a-transactional-email). Provider errors are logged without email bodies or tokens. A failed initial send rolls back account creation.

## Build checks

```bash
dotnet build backend
npm --prefix frontend run build
npm --prefix frontend run lint
```

The one-off verification scripts have been removed. After configuring Brevo, check registration, email verification, passwordless sign-in, and resend from the deployed storefront.

## Retired collections

[backend/SQL/remove_collections.sql](backend/SQL/remove_collections.sql) removes `collection_products` and `collections`, including their rows. It preserves `products` and refuses unexpected dependencies using `RESTRICT`. No Neon changes were executed as part of implementation.

# Render and Vercel variables

Set these directly in each deployment's environment settings. No local environment files or helper scripts are needed. Enter values without wrapping quotes and replace the example domains with your actual URLs.

## Render — backend

| Variable | Value |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://0.0.0.0:10000` |
| `ConnectionStrings__DefaultConnection` | `Host=YOUR_NEON_HOST.neon.tech;Database=neondb;Username=YOUR_USER;Password=YOUR_PASSWORD;SSL Mode=VerifyFull;Channel Binding=Require` |
| `Email__BrevoApiKey` | Your Brevo API key (not an SMTP key) |
| `Email__From` | `Snug Rebel <accounts@yourdomain.com>` — must be approved in Brevo |
| `Email__StorefrontUrl` | `https://your-storefront.vercel.app` |
| `Cors__AllowedOrigins__0` | `https://your-storefront.vercel.app` |
| `Cors__AllowedOrigins__1` | `https://your-admin.vercel.app` |

Render expects a listener on `0.0.0.0`, with default port `10000`. If you configured a different Render `PORT`, use the same numeric port in `ASPNETCORE_URLS`. [Render port binding](https://render.com/docs/web-services#port-binding)

Use the PostgreSQL connection-string format shown above, not a `postgres://` URL. Storefront and CORS URLs must be origins without paths or trailing slashes. Add further CORS origins with indexes `2`, `3`, etc. only for additional frontends you use.

For Cloudinary uploads, also set these three backend variables:

| Variable | Value |
| --- | --- |
| `Cloudinary__CloudName` | Your Cloudinary cloud name |
| `Cloudinary__ApiKey` | Your Cloudinary API key |
| `Cloudinary__ApiSecret` | Your Cloudinary API secret |

Cloudinary is optional only if `wwwroot/uploads` has persistent storage; without it the backend stores uploads locally. `AllowedHosts` is optional and defaults to `*`; set it to your API hostname if you want host filtering.

## Vercel — storefront project (`frontend`)

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://your-api.onrender.com/api` |
| `VITE_USE_MOCK_API` | `false` |

## Vercel — admin project (`admin`)

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://your-api.onrender.com` |

The storefront URL includes `/api`; the admin URL does not. Vite embeds these public values into the browser build. Keep database credentials, Brevo keys, and Cloudinary credentials only on Render.

Apply Vercel variables to the deployment environments you use (Production and optionally Preview), then redeploy. Changes apply to new deployments. [Vercel environment variables](https://vercel.com/docs/environment-variables)

Run `backend/SQL/email_verification.sql` and then `backend/SQL/email_otp.sql` in Neon before deploying OTP support. See [email verification setup](EMAIL_VERIFICATION.md).

# Password recovery and review regressions

Build the backend and install the frontend dependencies first. With .NET 10,
`dotnet-ef` 10, Python 3, Docker, and Node/Playwright on PATH:

```sh
dotnet build backend
python tests/FeatureFlows/run.py
```

The runner expects a local PostgreSQL container named `snug-onboarding-db`,
with user `snugdev` and trust authentication, accessible on port 5433.
Override the container name with `PG_CONTAINER`. It creates a uniquely named
database, initializes the current EF model, and removes that database afterward.
It never uses the application's configured production connection string.

Browser checks use the `playwright` Node package and `/usr/bin/chromium`;
override the executable with `CHROMIUM_PATH`. Set `SKIP_BROWSER=1` to run only
API checks (this does not count as browser validation).

The runner starts its own API, Vite server, and local email-provider stub on
free ports, then stops them. It tests reset completion, password validation,
generic unknown-address responses, resend cooldown, code purpose isolation,
expiry, attempt limits, replay rejection, provider-failure rollback, inactive
accounts, old-password rejection, and session revocation. Review checks cover
IDs from tracking and account orders, authentication, session-based ownership,
delivered-order eligibility, duplicates, and a real browser submission with the
account-order fallback disabled.

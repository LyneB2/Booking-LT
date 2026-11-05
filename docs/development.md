# Cloud development and verification — M1.1

Codex builds in the managed Linux cloud environment. Claude independently reviews
implementation PRs. The owner needs only a browser/Codex app on the Mac: **no
local Docker, Node, dependencies, database or repository checkout**. Source,
commands, PostgreSQL and Chromium all run in the cloud. Do not provision paid
resources, deploy production or merge during this task.

## Open and run in the cloud

Select the Booking-LT cloud environment, open the repository there and use its
terminal. This task uses `/workspace/Booking-LT`. A new cloud environment needs
GitHub repository access and Node 24. Cloud networking must permit GitHub and npm;
use its configured proxy and CA trust. The current cloud already has Chromium at
`/usr/bin/chromium`. Standard GitHub-hosted CI installs Chromium itself.

```sh
cd /workspace/Booking-LT
npm ci
npm run dev:cloud
```

Open port 3000 in the cloud browser or the environment's forwarded-port browser
view. The sandbox launches a **real, disposable native PostgreSQL server** on a
random loopback port, applies the checked-in SQL migrations twice to verify
idempotence, seeds fictional data and starts Next.js. PostgreSQL binaries arrive
as a locked npm development dependency; no Docker or system database install is
needed. Run as a non-root cloud user (PostgreSQL requires it).

**Auth and email in this sandbox are simulated.** Sign in as
`platform@example.test` for administration, `ana@example.test` for a complex
administrator, or `disabled@example.test` for a refused account. After requesting
a code, open the loopback fixture-mailbox URL printed by the cloud terminal; the
code is displayed there, never logged. That mailbox exists only inside the
standalone test fixture. Application code has no fixture mode or authentication
bypass. Everything in this sandbox disappears when the process stops. Stop with
Ctrl-C. A full hosted flow uses `npm run dev` and the real configuration below.

A forwarded URL has a different Origin from localhost. For a hosted-service dev
run set `APP_ORIGIN` to its exact trusted HTTPS origin. The fixture sandbox and
Playwright use the cloud browser at `http://localhost:3000`.

## Verified commands

Run from the repository root **in the cloud**, not on the Mac:

| Command | Result and purpose |
| --- | --- |
| `npm ci` | Reproducible workspace installation from the lockfile |
| `npm run dev:cloud` | Disposable PostgreSQL + explicitly simulated Auth/email + Next.js dev server |
| `npm run lint` | ESLint including Next.js and React rules |
| `npm run typecheck` | Shared packages, scripts/tests and web types |
| `npm test` | Authorization table and boundary tests |
| `npm run test:db` | Starts/stops disposable PostgreSQL; migrations, real API/domain SQL and privilege tests |
| `npm run build` | Production Next.js compilation; no credentials needed to compile |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | Production server with real PostgreSQL and simulated Auth, desktop + mobile Chromium |
| `npm run check` | Lint, types, unit tests, PostgreSQL integration tests, production build |

On a fresh cloud/CI machine without system Chromium, run
`npx playwright install --with-deps chromium` in that machine and omit
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. This alternative is configured in CI; the
current cloud run uses preinstalled Chromium. PR checks require no repository
secrets. Actions upload browser screenshots/traces for review. Make the
`Foundation checks / foundation` job a required branch-protection check in GitHub
repository settings; code alone cannot enforce branch protection.

The migration and bootstrap commands below have been exercised with the disposable
PostgreSQL fixture, including repeat/concurrent bootstrap rejection. They have
**not** run against a hosted Supabase project.

## Project structure and API

- `apps/web`: responsive Next.js app and server-only Auth adapter. `/sign-in`,
  `/workspace` (own account ID) and `/admin` (complex creation and team access).
- `packages/core`: framework-independent permissions; `packages/schemas`: strict
  shared Zod input validation; `packages/db`: Drizzle mappings, domain transactions,
  operator bootstrap and authoritative versioned SQL migrations.
- `tests`: permission table, API/PostgreSQL integration tests, browser tests and
  explicitly simulated Supabase protocol fixtures. `scripts`: cloud/operator tools.
- `design/previews`: preserved PR #2 designs; `design/evidence/m1-1`: foundation
  screenshots. No Expo UI exists yet; shared identity, JSON API and permissions
  support that future iOS/Android app.

`POST /api/v1/auth/request-code`, `POST /auth/verify-code`, `POST /auth/sign-out`;
`GET /api/v1/me`; `GET|POST /api/v1/admin/complexes`;
`GET|POST /api/v1/admin/complexes/:id/roles`;
`DELETE /api/v1/admin/complexes/:id/roles/:assignmentId`;
`GET /api/v1/complexes/:id` (authorized, minimal workspace metadata).
All abbreviated Auth paths also have the `/api/v1` prefix. Every API response is
`private, no-store`. Web mutations require the configured exact Origin. Native
clients may use a valid bearer token without cookies; invalid or empty bearer
headers cannot fall back to a cookie session. No token or role list is returned by
the web sign-in endpoint. Roles and disabled status are read anew in PostgreSQL.

## Missing configuration for real Supabase / Resend verification

No project, email service or Vercel resource was created in this task. The cloud
reported no bound secrets or outbound service identities. Needed next:

1. An owner-controlled **development** Supabase project, distinct from production,
   with its HTTPS project URL and publishable key. Supply `SUPABASE_URL` and
   `SUPABASE_PUBLISHABLE_KEY` to the cloud web process. These identify the provider;
   no service-role key is required in the application.
2. Its migration-owner PostgreSQL connection as cloud-only secret
   `MIGRATION_DATABASE_URL` (direct/session connection), with privileges on
   `auth.users` to install the profile trigger and to create the private schema
   and runtime role. Run `npm run db:migrate`. Supabase supplies `auth.users`;
   never run the fixture schema on a real project.
3. Use the provider's secure SQL editor to assign a generated login password to
   the migration-created `booking_app` role (`ALTER ROLE booking_app LOGIN PASSWORD
   '<generated-secret>'`). Supply its connection as `DATABASE_URL` to the web
   process. The runtime cannot migrate, edit audits, disable/enable profiles, or
   grant platform roles. Do not put owner credentials into Vercel/web variables.
   For Vercel, use the transaction-pooler URL with prepared statements disabled
   (already configured in the driver); use verified TLS (`sslmode=require`, and
   the provider's CA trust). The real pooler/TLS connection remains untested.
4. Cloud networking: allow the actual project's HTTPS Auth hostname and its
   PostgreSQL/pooler TCP hostname and port (usually 5432 direct/session or 6543
   transaction pooler). This environment currently has no external TCP grants or
   Supabase host allowlist. Add those exact hosts through cloud configuration;
   do not bypass the session proxy or disable TLS.
5. Configure Supabase email sign-in for **six-digit codes**, with the email template
   displaying `{{ .Token }}` rather than relying on a magic-link callback. Set a
   10-minute code expiry and a minimum 60-second resend cooldown; enable provider
   issuance and verification rate limits. Provider verification and cooldowns
   enforce this; the app never stores codes or implements authentication itself.
   Check rate-limit behavior via the application's server proxy as well as directly:
   Supabase may see the server's source IP. The request endpoint gives the same
   generic response for account/privacy safety. Tune limits/CAPTCHA before a
   public launch. **These hosted settings have not been verified.**
6. For real email delivery, configure Supabase custom SMTP with Resend, an
   owner-verified sending domain/address, and its SMTP credentials in Supabase
   (not the web app). Restricted built-in Supabase email can be used only within
   its allowed testing recipients. No Resend API key is needed in the web runtime.
7. Set `APP_ORIGIN` to the trusted dev HTTPS origin, Supabase Site URL/allowed URLs
   accordingly, short-lived access tokens and refresh-token rotation. Review
   session expiry/reuse settings; platform-admin MFA is required before launch.
   Vercel project binding, preview hosting and real-device staging are deferred.

Then sign in once with the intended administrator email, complete its code
verification, and copy the resulting Supabase user UUID from My account. In the
**cloud operator terminal** supply `BOOTSTRAP_ADMIN_USER_ID` and
`MIGRATION_DATABASE_URL` securely and run `npm run admin:bootstrap`. The command
checks email confirmation, provider ban state and enabled profile, takes the
shared authorization lock, grants and audits the first admin in one transaction.
It refuses a second bootstrap even if the historical grant was revoked. There is
no public admin-creation endpoint, email allowlist auto-promotion, default admin
password or web-exposed bootstrap secret. Remove operator variables afterward.
Further platform-admin grants/recovery require separately authorized operator work.

## Account disablement and migrations

Disabling an account is operator maintenance in M1.1; no disable-account UI is
claimed. With operator credentials, begin a transaction, acquire
`SELECT pg_advisory_xact_lock(18640, 1)`, set the target profile's `disabled_at`,
append an `account.disabled` audit event with the operator's authorized platform
actor UUID and target UUID, then commit. Never change `auth.users` or profiles as
an unaudited runtime shortcut. Disabled profiles are refused even with valid
provider tokens and active platform/complex roles. Re-enable/recovery also require
separately authorized operator work and an audit event. A provider ban and an
application profile disable are separate controls; apply provider bans when an
account must also lose provider access.

Add each schema change as a new numbered SQL file in `packages/db/migrations` and
update Drizzle mappings in the same PR. The migration runner serializes execution,
tracks checksums, and commits the migration/history atomically; never edit an
already-applied file or use schema push against shared environments. Operator
credentials alone run migrations. Before hosted rollout, test on a fresh dev
project, back up shared data and plan forward repair; no production migration or
rollback is claimed here. The native test binary is PostgreSQL 18.6; repeat on the
chosen Supabase PostgreSQL version before staging sign-off.

## Verification boundary

Verified in this cloud: permission table, real PostgreSQL migrations/constraints/
privileges/transactions, actual server handlers, and actual browser rendering,
cookie storage and Supabase SDK protocol integration. Screenshots include only
fictional records. Browser Auth responses, OTP inbox and the managed `auth.users`
table are fixtures. They do **not** prove hosted Supabase behavior, Resend delivery,
real OTP expiry/rate limits, refresh-token rotation or hosted logout/revocation.
The [verification record](verification-m1-1.md) lists actual counts; the review PR
records GitHub Actions status separately.

Deferred: page editor, draft/preview/publication, photos, bookings, payments,
operational modules, mobile screens, staging deployment and real-phone testing.
Their atomic publication/private-photo/save → preview → publish contracts are in
[engineering.md](engineering.md) §11–12. No implementation or tests for those
later features are claimed by this foundation.

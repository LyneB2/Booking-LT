# M1.1 verification — 2026-11-05

Run in the managed Linux cloud environment, Node 24.22.1. No Mac development setup,
Docker, paid resource, production deployment or merge was used.

| Check | Observed result |
| --- | --- |
| `npm ci` | Passed: reproducible install |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed (packages, scripts/tests, web) |
| `npm test` | 54 authorization-table tests passed |
| `npm run test:db` | 14 PostgreSQL integration tests passed |
| `npm run build` | Next.js production build passed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 6 tests passed, desktop and mobile |
| `npm audit --omit=dev --json` | 0 reported production dependency vulnerabilities at time of check |
| Operator CLI smoke on disposable PostgreSQL | Migration succeeded; first bootstrap succeeded; repeat refused |

Integration tests verify actual PostgreSQL schema constraints and privileges,
bootstrap rejection for disabled/unconfirmed/banned accounts, concurrent bootstrap,
allowed/denied access, cross-complex tampering, disabled accounts, role revocation,
concurrent grant deduplication, in-flight operation ordering with revocation,
disablement while waiting for authorization, immutable audit privileges, and
transaction rollback when audit insertion fails. API integration tests inject only
identity verification; the handlers, domain code and database role are real.

Browser tests use the real Supabase SDK/cookie adapter with a **simulated Auth
HTTP service and OTP mailbox**. They cover sign-in, invalid codes, HttpOnly/Secure/
SameSite cookies, missing-Origin and empty-Authorization CSRF refusal, native bearer access
and invalid bearer refusal, role grants, revocation with the same signed-in session,
disabled and lesser accounts, sign-out, no horizontal scroll and serious/critical
axe scans. [Screenshots](../design/evidence/m1-1/README.md) were inspected visually.
No tokens, codes or session cookies appeared in captured command logs; fixture
mailbox responses and failure traces can contain only disposable fictional sessions.

Not verified: hosted Supabase migrations, Auth email delivery, actual OTP expiry/
rate limits, token refresh/rotation and hosted logout; Resend SMTP/DNS; real pooler/
TLS connectivity; Vercel hosting; real-phone staging. Exact prerequisites and the
cloud runbook are in [development.md](development.md).

Automated pull-request checks are in `.github/workflows/checks.yml`; GitHub's
observed run status is recorded in the implementation PR, separately from these
cloud results. Branch protection requires repository settings, not a code change.

No tests or implementation are claimed for page editing, publication, photo
uploads, bookings, payments, operations or mobile UI. Publication atomicity,
private-media failure handling and stale-preview behavior are specifications for
subsequent slices in `engineering.md` §11–12.

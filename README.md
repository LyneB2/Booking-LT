# Booking LT

A vacation rental marketplace and operations platform for condominium complexes.
One backend and identity model will serve the responsive web and future shared
iOS/Android app. Codex builds; Claude independently reviews pull requests.

M1.1 adds the application foundation: email-code sign-in, scoped authorization,
complex creation and team access, versioned SQL migrations and pull-request checks.

- [Cloud development and verification](docs/development.md) — run everything in the
  cloud; no Docker, dependencies or checkout needed on the owner's Mac. Explicitly
  distinguishes real PostgreSQL/browser checks from simulated Auth and email.
- [Product requirements](docs/product.md) and [engineering standards](docs/engineering.md).
- [Milestone plan](docs/milestones/m1-complex-page.md) and [preserved designs](design/previews/m1-complex-page.html).

No production deployment, paid provisioning or merge is included. The page editor,
photos, bookings, payments and operational modules remain for later milestones.

# M1.1 foundation decisions — 2026-11-05

Product-owner approval: M1.1 only, TypeScript, Next.js, Supabase, Drizzle, Zod,
Vitest and Playwright. Vercel is planned and Resend will supply Supabase SMTP.
The initial workflow was Codex building and Claude reviewing. The owner reversed
those roles on 2026-11-06: Claude builds and Codex independently reviews. Preserve
the implementation for assessment and reuse. No paid provisioning, production
deployment, merge or later module is authorized.

- Preserve PR #2 at `0484c8a`; stack this implementation on its planning branch.
  Keep its design board and all screenshots. Calm teal, generous spacing, system
  typography and clear forms guide the foundation screens; no page editor ships.
- npm workspaces use the Node 24 toolchain already available in the cloud. The
  planning document's pnpm suggestion was not a product requirement; npm avoids
  an extra package-manager bootstrap. All dependency versions are locked.
- Plain TypeScript authorization and Zod validation are shared packages. Next.js
  exposes `/api/v1` JSON endpoints. Expo remains the future shared iOS/Android UI;
  bearer authorization already shares the same identity and domain services.
- Supabase handles codes and sessions. Web cookies are HttpOnly, SameSite=Lax,
  Secure in production and use a `__Host-` prefix there. The server verifies
  identity using Supabase `getUser()` on every protected request, then checks the
  current profile and assignments in PostgreSQL. No permissions live in a JWT.
- Use private `booking` tables with no browser-role privileges and a restricted
  `booking_app` runtime login. Audit writes and administrative changes commit
  together. Bootstrap and disabling profiles require operator credentials.
- Administrative authorization-sensitive transactions use a shared advisory lock
  for clear ordering with revocation. This deliberately serializes a small amount
  of foundation traffic; redesign before high traffic, preserving the race tests.
- Disposable native PostgreSQL, launched by `embedded-postgres` in the cloud,
  verifies SQL without Docker or a hosted account. Its Auth schema and HTTP Auth
  service are explicit fixtures, not evidence of working Supabase or Resend.
  The web application contains no fixture mode or authentication bypass.
- Future publication uses one transaction for revision, pointer and audit. Photos
  remain in private storage and public delivery checks committed revision
  membership. This replaces PR #2's unsafe pre-commit public-copy proposal.

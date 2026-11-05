# Booking LT — Engineering Standards

Status: **Draft for review.** Shared by every contributor and coding agent
(Claude, Codex, others). The product requirements live in [product.md](product.md).

Last updated: 2026-11-05

---

## 1. Working principles

1. Act as a senior full-stack engineer and product designer. Explain decisions in
   plain language; when asking questions, **number them**.
2. Keep it simple. Avoid services, dependencies and abstractions that the current
   milestone does not need. Prefer boring, well-supported tools.
3. Build in **small, testable milestones** that each connect frontend, backend and
   database end to end, rather than building layers in isolation.
4. Propose scope and acceptance criteria **before** implementing a module, and get
   them approved.
5. Record approved requirements and decisions in this repository
   (`docs/product.md`, `docs/engineering.md`, and `docs/decisions/` once it exists).
   Do not rely on chat history.
6. Be honest about status: clearly label what is **implemented, mocked, untested or
   unfinished**. Never claim the product is bug-free or production-ready without
   evidence.

## 2. Proposed architecture and stack

> **Proposal — not yet approved.** Nothing here is installed. Setup commands will
> be added to this document only after they exist and have been verified.

### 2.1 Shape

```
  Website (responsive)      Booking LT app (iOS + Android)
            \                      /
             \   HTTPS (one API)  /
              v                  v
          Backend application (single deployable)
     auth · authorization · domain logic · validation
                     |               |
               PostgreSQL       Object storage
            (system of record)  (photos, documents;
                                 private by default)
                     |
          Payment provider adapter (replaceable; e.g. Pagadito)
```

- **One backend, one database, one account system** for all surfaces.
- A **modular monolith**: one deployable application with clear internal modules
  (complexes, properties/listings, reservations, registrations, operations,
  payments, ledger). No microservices.
- Multi-complex ("multi-tenant") data lives in one database. Every complex-owned
  row carries its `complex_id`; property-owned rows carry `property_id`.

### 2.2 Recommended stack (to be confirmed)

| Concern | Recommendation | Why |
| --- | --- | --- |
| Language | TypeScript everywhere | One language for web, mobile and backend; shared types and validation schemas. |
| Web | Next.js (React) | Server rendering for SEO on public complex/listing pages; mature, well supported. |
| Mobile | Expo (React Native), one app for iOS and Android | Shares language, validation and API client with web; managed builds and over-the-air updates; avoids two native codebases. |
| Backend | Server code inside the Next.js app at first, with domain logic in plain TypeScript modules independent of the framework | Fewer moving parts. Can be split into a separate API service later without rewriting domain logic. |
| Database | PostgreSQL | Transactions, constraints (incl. exclusion constraints for overlapping date ranges), row-level security if needed. |
| Data access | A typed query builder/ORM with versioned migrations (e.g. Drizzle or Prisma) | Reviewable schema changes. |
| Validation | A schema library (e.g. Zod) shared by client and server | Same rules on both sides; server is authoritative. |
| Auth | An established provider/library (e.g. Auth.js, Clerk, or Supabase Auth) — never home-made password or session handling | Security-sensitive; supports web and mobile. |
| Storage | S3-compatible object storage with signed URLs | Private by default; guest documents never public. |
| Monorepo | One repository with `apps/web`, `apps/mobile`, `packages/*` (shared types, validation, API client) | Keeps web and mobile in sync. |

### 2.3 Web vs mobile tradeoffs (plain language)

- **Responsive website only, no app at first:** fastest, but host/staff workflows
  (photos, notifications, arrivals at the front desk) are weaker.
- **Expo/React Native app (recommended):** one codebase for both phones, shares
  logic with the web, good camera/notification support. Some UI is still written
  twice (web components vs native components).
- **Fully native (Swift + Kotlin):** best platform fit, but three codebases to
  maintain — too costly for this team size.
- **Web wrapped as an app:** cheap, but feels non-native and app-store review is
  harder.

Suggested sequencing: build the web for the complex module first, while keeping
all logic behind the API so the mobile app can be added without backend changes.

## 3. Domain and permission model

Detailed entity design is a Phase 0 deliverable. Fixed principles:

1. **Role assignments are scoped.** A `role_assignment` links a user to a role at a
   scope: platform, a specific complex, or a specific property. One user can have
   many assignments.
2. **Cohost grants** are per property, list explicit permissions (e.g.
   `calendar.manage`, `messages.reply`, `pricing.edit`, `earnings.view`), record
   who granted them, and can be revoked (revocation is immediate; history kept).
3. **Complex staff see complex operations, not owner listings.** Complex admin and
   front desk read reservation/registration data for properties in their complex
   only, limited to the fields their role needs.
4. **Listing lifecycle** is explicit: `draft → invited → claimed → verified →
   published → unpublished`. Bookability is checked on the server from this state.
5. **Shared inventory:** a property has one or more rentable configurations; each
   configuration maps to the physical spaces it occupies. A reservation reserves
   spaces, and the database prevents two active reservations from occupying the
   same space on overlapping dates.
6. **Audit trail** for sensitive changes: guest registrations, permission grants
   and revocations, listing claims, commission agreements, payouts and admin actions.

## 4. Security standards

1. **Authorization is enforced on the server** for every read and write, based on
   the user's scoped relationships. Hidden buttons are not security.
2. Add **database and storage controls** as a second layer: every query is scoped
   by complex/property; consider PostgreSQL row-level security for the most
   sensitive tables; storage buckets private, served via short-lived signed URLs.
3. Use **established authentication** tools. Support secure session handling for
   web and token handling for mobile; MFA for platform admins before launch.
4. **Validate all input** on the server (types, lengths, formats, ownership of
   referenced records). Use parameterised queries only.
5. **Protect secrets:** never commit secrets; use environment variables / a secret
   manager per environment; `.env*` files are git-ignored; rotate on exposure.
6. **Minimize guest-data exposure:** collect only fields the complex actually
   requires, show each role only what it needs, and define retention/deletion.
7. **Keep sensitive data out of logs**: no passwords, tokens, payment details,
   ID numbers or full guest records in logs, errors or analytics.
8. Rate-limit authentication, invitations, enquiry forms and claim verification.
9. Keep dependencies few and up to date; review new dependencies in PRs.

## 5. Money, bookings and payments

To be designed in detail when these features are implemented:

1. **Precise money:** store amounts as integer minor units (or exact decimals)
   with an explicit currency; never floating point. Define rounding rules once.
2. **Booking concurrency:** availability checks and reservation creation happen in
   one transaction backed by a database constraint, so two guests cannot book
   overlapping stays (including across shared-space configurations).
3. **Payment processing vs commission accounting:** the payment provider sits
   behind a small adapter interface. Commission splits are recorded in an
   internal, append-only **ledger** that is the source of truth, regardless of
   whether the provider performs the split.
4. **Retries and idempotency:** every payment operation and webhook handler is
   idempotent (idempotency keys, deduplicated webhook events).
5. **Refunds and cancellations** produce ledger entries reversing the relevant
   commission amounts.
6. **Reconciliation:** regular comparison of provider records against the ledger,
   with a platform-admin view of mismatches.
7. The **Pagadito integration is unverified**. Do not describe it as working until
   it has been tested end to end in this codebase, including the commission issue.

## 6. Environments and data

1. Separate **development, staging and production**: separate databases, storage,
   credentials and payment-provider accounts (sandbox outside production).
2. Use **fictional development and test data** only. Never copy production guest
   data into development or staging.
3. Database changes go through versioned migrations reviewed in PRs.

## 7. Testing and verification

Each milestone must include meaningful automated checks before it is called done:

1. **Unit tests** for domain rules (permissions, availability, pricing, money).
2. **Integration tests** against a real PostgreSQL database for API/database behaviour.
3. **Authorization tests across roles and complexes**, including:
   - access allowed for the right role and scope,
   - access **denied** for other complexes, other properties and lesser roles,
   - access denied **after a permission is revoked**,
   - unclaimed drafts never returned by public/booking endpoints.
4. **End-to-end tests** for critical workflows (e.g. complex page edit, guest
   registration, booking) on web.
5. **Rendered UI inspection** at mobile and desktop widths (screenshots in PRs for
   UI changes), plus basic accessibility checks.
6. Type checking and linting in CI.

Commands for these checks will be documented here once they exist and have been
verified to run.

## 8. Workflow: branches, pull requests and review

1. One focused **feature branch per change**; small pull requests.
2. Every PR states: what changed, how it was tested (with real output), and what is
   **implemented / mocked / untested / unfinished**.
3. PRs are reviewed independently (e.g. by Codex or a human) before merge. Agents
   do not merge their own PRs.
4. UI PRs include desktop and mobile screenshots.
5. Approved requirement or design changes update `docs/` in the same PR.

## 9. Release readiness (before any public launch)

1. Security review (authorization, data exposure, auth configuration).
2. Payment review (flows, ledger, refunds, reconciliation) with the provider's
   production approval.
3. Legal/privacy review of guest data handling for the Dominican Republic.
4. Monitoring and alerting for errors, payments and availability.
5. Automated **backups** and a **tested restoration**.
6. A documented **rollback plan** for application and database changes.
7. Staging sign-off on the release candidate.

## 10. Current state of this repository

- Contains documentation only. No application code, dependencies, CI or
  environments exist yet.
- No setup or verification commands exist yet.

# Milestone 1 — Complex public page: plan and design

Status: **Proposed — awaiting product-owner approval.** Nothing in this document is
implemented. No code, dependencies, accounts or environments exist yet. When an
item is approved, move it to the approved decisions in `docs/product.md` or
`docs/engineering.md`.

Last updated: 2026-11-05

Design previews: [`design/previews/m1-complex-page.html`](../../design/previews/m1-complex-page.html)
(open in a browser) and screenshots in [`design/previews/screenshots/`](../../design/previews/screenshots/).

---

## 1. Goal

> An authorized complex administrator can edit, save, preview and publish their
> complex's public page. Changes persist in the database. Unauthorized users and
> administrators of other complexes cannot modify it.

This is the first end-to-end slice: browser → server → authorization → database →
public page. It sets up the patterns every later module reuses: sign-in, scoped
roles, server-side checks, audit records, draft/publish, tests across roles.

## 2. Scope

### In scope
1. Sign-in with an email one-time code (no passwords).
2. Platform administrator: create a complex (name, address slug), grant and revoke
   the **complex administrator** and **front-desk** roles for an existing account.
   A minimal admin screen, not a full back office.
3. Complex administrator: edit the page in a structured form (basics, about text,
   amenities from a fixed list, complex rules, location note, public contact
   details, brand colour from accessible presets), **save a private draft**,
   **preview** it, and **publish** it.
4. Public complex page at `/complexes/<slug>` that shows only the published version.
5. Publication history (each publish is kept as an immutable revision) and an audit
   record of role changes, saves and publishes.
6. Photos (cover + up to 12, with required alt text) — **only if question 4 in §12
   is answered yes**; planned as its own slice (M1.3).
7. Content in the languages chosen in §12 question 3.
8. Deployment to a staging environment with fictional data.

### Out of scope (later milestones)
Announcements; complex admins managing their own team; invitation emails; listings
and the "Stays" section; properties for sale and preconstruction sections; arrivals
and guest registration (design preview only, §9); custom domains per complex; map
embeds; unpublishing a page or restoring an old revision from the UI; product-wide
dark mode; the Expo app.

## 3. Minimum data model

PostgreSQL. Names are proposals. Every complex-owned row carries `complex_id`.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | App-side record for each signed-in account (identity lives in the auth provider) | `id` (= auth user id), `display_name`, `disabled_at`, `created_at` |
| `complexes` | One row per complex | `id`, `slug` (unique, lowercase `a-z0-9-`), `name`, `country_code` (`DO`), `status` (`active` / `archived`), `created_by`, `created_at` |
| `role_assignments` | Who holds which role, where | `id`, `user_id`, `role` (`platform_admin` / `complex_admin` / `front_desk`), `complex_id` (null only for `platform_admin`), `granted_by`, `granted_at`, `revoked_by`, `revoked_at` |
| `complex_pages` | The current editable draft, one per complex | `complex_id` (PK), `draft` (JSON), `draft_version` (integer, +1 per save), `draft_updated_by`, `draft_updated_at`, `published_revision_id` |
| `complex_page_revisions` | Immutable snapshot created on every publish | `id`, `complex_id`, `revision_number`, `content` (JSON), `from_draft_version`, `published_by`, `published_at` |
| `complex_media` *(M1.3, if photos approved)* | Uploaded images | `id`, `complex_id`, `storage_key`, `status`, `content_type`, `bytes`, `width`, `height`, `uploaded_by`, `created_at` |
| `audit_events` | Append-only record of sensitive actions | `id`, `occurred_at`, `actor_user_id`, `action`, `complex_id`, `subject_id`, `details` (no personal data beyond ids) |

Database rules:
- A check constraint ties `role = platform_admin` to `complex_id IS NULL`, and the
  other roles to a non-null `complex_id`.
- A partial unique index allows only one **active** (not revoked) assignment per
  user, role and complex. Revoking sets `revoked_at`; rows are never deleted, so
  history stays.
- Phase 2 adds a `property_id` scope to `role_assignments` for hosts and cohosts.
  The table is designed so that is an added column, not a redesign.

**Why the page content is one JSON document.** The page is edited and published
as a whole, and each publish keeps a full snapshot. Storing it as one validated
JSON document makes drafts, previews and history simple. The tradeoff is that the
database checks less of its structure, so the server validates every save and
publish against one shared schema (with a `schemaVersion` field for future
changes), and tests cover that validation. Proposed shape:

```jsonc
{
  "schemaVersion": 1,
  "text": {                      // one block per approved language (§12 Q3)
    "es": { "tagline": "…", "about": "…", "rules": ["…"], "locationNote": "…", "hours": "…" },
    "en": { "tagline": "…", "about": "…", "rules": ["…"], "locationNote": "…", "hours": "…" }
  },
  "amenities": ["pool", "beach_access", "parking"],   // keys from a fixed catalogue
  "contact": { "phone": "+18095550142", "email": "frontdesk@example.com", "whatsapp": true },
  "brandPreset": "lagoon",                            // preset key, never a free colour
  "photos": [{ "mediaId": "…", "alt": { "es": "…", "en": "…" } }],  // M1.3
  "coverMediaId": "…"                                                // M1.3
}
```

Text is plain text only (no HTML or Markdown) and is rendered escaped, which removes
a whole class of script-injection problems. Limits: tagline 140 characters, about
2,000, up to 20 rules of 200 characters each.

## 4. Permissions for this milestone

Checked on the server for every request, by reading active `role_assignments` from
the database each time. Roles are **not** stored inside sign-in tokens, so a
revocation takes effect on the very next request, even in a tab that is already open.

| Action on complex A | Anonymous | Signed in, no role | Front desk of A | Complex admin of A | Complex admin of B | Platform admin | Revoked admin of A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View A's published page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Open A's editor, draft or preview | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ ¹ | ❌ |
| Save A's draft | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ ¹ | ❌ |
| Publish A's page | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ ¹ | ❌ |
| Upload A's photos (M1.3) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ ¹ | ❌ |
| View A's publication history | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Create a complex; change name or slug | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Grant or revoke roles for A | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

¹ Platform admins do not edit page content directly. If support work requires it,
a platform admin grants themselves the complex-admin role for that complex, which
leaves an audit record, and revokes it afterwards. This keeps "who changed the
page" unambiguous. Front-desk staff get no page access in this milestone; their
screens arrive with arrivals (phase 3).

Second layer of protection in the database and storage:
- Application tables live in a schema that is **not exposed** through the hosting
  provider's automatic REST API, and the browser-facing database roles have **no
  privileges** on them. Only the server's own least-privilege database role can
  read or write them.
- That server role may only `INSERT` and `SELECT` on `complex_page_revisions` and
  `audit_events`, so history cannot be edited or deleted by application code.
- Draft photos sit in a **private** bucket; published photos are copied into a
  public bucket under the revision's path at publish time.

## 5. How editing, preview and publishing work

1. **Edit.** The form loads the current draft and its `draft_version`. A badge shows
   "Unsaved changes" until the admin saves; leaving the page with unsaved changes
   asks for confirmation.
2. **Save draft.** The server checks the role, validates the input, and saves only
   if the stored `draft_version` still matches the one the form loaded. If another
   admin saved in the meantime, the save is refused with a clear message and
   nothing is overwritten. Drafts may be incomplete.
3. **Preview.** A staff-only page renders the saved draft with the public page's
   layout, under a banner saying it is not public. It is never cached and tells
   search engines not to index it. Changed sections are marked.
4. **Publish.** A confirmation lists what changed. The server re-checks the role
   at that moment, checks the draft is complete enough to publish (required fields,
   alt text on every photo, at least one language complete), and publishes **the
   exact draft version that was previewed**. If the draft changed after the
   preview, publishing is refused and the admin is asked to preview again. On
   success it stores a new revision, points the public page at it, records an
   audit event and refreshes the public page cache.
5. **Public page.** Shows only the published revision. A complex with no published
   revision, or an archived complex, returns "not found".

## 6. Acceptance criteria

Each criterion maps to at least one automated test (§10).

**Sign-in and roles**
1. A person can sign in with an email one-time code. Codes expire and are
   rate-limited.
2. A platform admin can create a complex with a unique slug and can grant or
   revoke complex admin and front-desk roles for an existing account. Each change
   creates an audit event.
3. The first platform admin is created with a one-off command run by an operator
   (documented once it exists). There is no sign-up path to platform admin.

**Editing and saving**
4. A complex admin of A can open A's editor and sees A's current draft.
5. Saving a valid draft persists it: after sign-out, sign-in and reload, the same
   content is shown.
6. Invalid input (over-length text, unknown amenity, unknown brand preset,
   malformed email or phone, HTML in text) is rejected with field-level messages,
   and nothing is saved.
7. Two admins editing the same draft: the second save based on an old version is
   refused with an explanation; the first save is not overwritten.
8. Fields that admins must not change through this form (complex id, slug, name,
   published revision) are ignored or rejected if sent in a request.

**Preview and publish**
9. Preview shows the saved draft in the public layout with a "not public" banner,
   and is reachable only by complex admins of that complex.
10. Before publishing, the public page still shows the previous published version.
11. Publishing creates a new immutable revision and the public page shows it on the
    next load.
12. Publishing is refused if the draft is incomplete, or if it changed since it was
    previewed.
13. The public page and its responses never contain draft-only content.

**Access control**
14. Anonymous users, signed-in users without a role, front-desk staff of A,
    complex admins of B and platform admins are refused (HTTP 403, or 404 where
    revealing existence would leak information) when they try to open A's editor
    or preview, save A's draft or publish A's page — through the UI and through
    direct requests to the server.
15. After a platform admin revokes Ana's complex-admin role for A, Ana's next save
    or publish is refused **with the same session, in an already-open tab**, and
    nothing changes.
16. A complex admin of A cannot affect B by putting B's id or slug in the URL or the
    request body.
17. The browser-facing database roles cannot read or write application tables
    through the hosting provider's REST API.

**Quality**
18. Public page, editor and preview work at 390 px and 1440 px wide with no
    horizontal scrolling, and the edit → save → preview → publish flow can be done
    with the keyboard only.
19. Automated accessibility checks report no serious or critical issues on these
    three screens.
20. Logs contain no one-time codes, tokens or session cookies.
21. The milestone runs on staging with fictional data, and the pull request lists
    what is implemented, mocked, untested and unfinished.

**Photos (M1.3, only if approved)**
22. Only JPEG, PNG and WebP up to 10 MB are accepted, checked by file content, not
    file name. Images are re-encoded and location metadata (EXIF/GPS) is removed.
23. Draft photos are not publicly reachable; published photos are. A complex admin
    of A cannot attach B's photos to A's page.
24. Publishing is refused while any photo lacks alt text.

## 7. Recommended stack, services and costs

### 7.1 Recommendation

| Concern | Choice | Why |
| --- | --- | --- |
| Language | TypeScript | One language across web, server and the future app. |
| Web + server | **Next.js** (App Router), one app | Server-rendered public pages (fast, indexable) and server code in one deployable. |
| Domain logic | Plain TypeScript package (`packages/core`) with the authorization rules | Independent of Next.js, reusable by any future API, easy to unit-test. |
| Validation | **Zod** schemas in a shared package | Same rules in the form and on the server; the server decides. |
| Database access | **Drizzle ORM** + versioned SQL migrations | Close to SQL, light, reviewable migrations, connects to any PostgreSQL. |
| Database, auth, file storage | **Supabase** (managed PostgreSQL + Supabase Auth + Supabase Storage) | One vendor for three needs; standard PostgreSQL; auth works for web and Expo; local copy runs in Docker for development and CI. |
| Sign-in method | Email one-time code via Supabase Auth; TOTP two-factor for platform admins before launch | No passwords to manage; codes work well in a mobile app (magic links are awkward there). |
| Transactional email | **Resend** (as Supabase Auth's SMTP sender) | Supabase's built-in email is for testing only; Resend's free tier covers this milestone. |
| Hosting | **Vercel** | Built for Next.js; preview deployment per pull request; simple rollback to a previous deployment. |
| Tests | **Vitest** (unit/integration), **Playwright** (end-to-end, screenshots), **axe-core** (accessibility) | Mainstream, well documented. |
| CI | **GitHub Actions** | Runs type checks, lint and all tests on every pull request, against a local Supabase stack. |
| Repository layout | `pnpm` workspace: `apps/web`, `packages/core`, `packages/schemas`, `packages/db`; `apps/mobile` added later | Small; no extra build orchestration until needed. |
| Region | Database in AWS `us-east-1` (N. Virginia), server functions in the same region | Closest common region to the Dominican Republic; keeps database calls fast. |

How we limit lock-in: the app reaches the database over a normal PostgreSQL
connection through Drizzle, not through Supabase's data API, so the data and queries
can move to any PostgreSQL host. Supabase Auth is the hardest part to replace later;
it is used through a thin module of our own so a future change is contained.

### 7.2 Approximate costs

Figures are approximate list prices summarised from third-party pricing write-ups
dated 2026; they were **not** confirmed on the vendors' own pricing pages and must
be checked before signing up. Taxes not included.

| Item | Development | Staging + production for M1 |
| --- | --- | --- |
| Vercel | $0 (local) | Pro, about **$20 per member per month** (the free Hobby plan does not allow commercial use) |
| Supabase | $0 (local Docker copy) | Pro, about **$25/month** per organisation, which includes a small compute credit that covers roughly one small project. A second project (staging) adds about **$10/month**; alternatively staging can use a free project, which pauses when idle and has no backups. |
| Resend | $0 | Free tier, about 3,000 emails/month (100/day) — enough for sign-in codes in M1 |
| Domain | — | about $10–20/year (needed to send email from your own address) |
| **Total** | **$0** | **about $45–55/month** plus the domain |

Later, not needed for M1: error monitoring (free tiers exist), Apple Developer
Program (about $99/year) and Google Play (about $25 one-off) for the app, Expo
build service (free tier to start).

### 7.3 Alternatives considered

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Vercel + Supabase** (recommended) | Fewest vendors; auth, storage and database together; good local tooling | Two paid services; auth tied to Supabase |
| B. Vercel + Neon (database) + Clerk (auth) + S3/R2 (files) | Polished auth screens and mobile SDK; serverless PostgreSQL | Four vendors to configure, secure and pay for; more integration code |
| C. One server on Render/Railway/VPS + managed PostgreSQL + a self-hosted auth library | Lowest lock-in; predictable cost | We run more ourselves: sessions, mobile tokens, email codes, backups, scaling |

## 8. Design previews

Open `design/previews/m1-complex-page.html` in a browser. Tabs switch between the
four screens; a toggle shows the desktop and phone layouts. Screenshots:

| Screen | Desktop | Mobile |
| --- | --- | --- |
| 1. Public complex page | `public-desktop.png` | `public-mobile.png` |
| 2. Administrator editor | `editor-desktop.png` | `editor-mobile.png` |
| 3. Preview and publish confirmation | `preview-desktop.png` | `preview-mobile.png` |
| 4. Arrivals — **design preview, not M1** | `arrivals-desktop.png` | `arrivals-mobile.png` |

Names and contacts are fictional ("Playa Serena Residences", `.example` contacts).
The cover photo (`design/previews/assets/complex-cover.webp`) was supplied by the
product owner for this review; the other photos are drawn placeholders. Confirm
the right to use that photo before it appears anywhere public. Design choices:
- **Public page:** large title and photo mosaic, generous white space, one calm
  accent colour taken from the complex's brand preset. The side card holds contact
  details; "Stays" is a clearly marked placeholder until listings exist. It states
  that bookings are with each condo's host, not the complex, to match the ownership model.
- **Editor:** one form split into sections, with a checklist showing what still
  blocks publishing. The draft status and last publication are always visible. On
  phones, actions sit in a bar above the tab bar where thumbs reach them.
- **Brand colours** are chosen from presets that all pass contrast checks, so a
  complex cannot make its page unreadable.
- **Preview** reuses the public layout under a dark staff-only banner and marks
  changed sections; publishing confirms with a summary of changes.

## 9. Where arrivals and guest registration will fit

The staff workspace has a left sidebar on desktop and a bottom tab bar on phones.
Sections are grouped by job:

- **Complex** — Public page (M1), Announcements (later)
- **Operations** — Arrivals, Guest registration (phase 3; shown as *Design preview*)
- **Settings** — Team & access (later)

Screen 4 shows Arrivals inside that same shell, labelled **Design preview — not
part of Milestone 1, sample data**. It shows the guest-registration ideas from
`product.md` §4.3: readiness status, "changes awaiting host review" shown separately
from the last reviewed roster, and guest names hidden until opened. Its fields are
placeholders until open decision 6 (guest registration fields and legal review) is
settled. In M1, unfinished sections are either hidden or shown as disabled
"coming later" items; they never lead to a working screen with fake data.

## 10. Verification plan

### 10.1 Test accounts (fictional, created by a seed script)
Two complexes, **A** and **B**, and these accounts: anonymous visitor; signed-in
user with no role; front desk of A; complex admin of A ("Ana"); complex admin of B
("Ben"); platform admin; Ana again after revocation.

### 10.2 Automated checks run on every pull request
1. **Type check and lint.**
2. **Unit tests** — the authorization rules as a table of every actor × action in §4,
   including revoked and archived cases; content validation for every field limit
   and rejection case.
3. **Integration tests against a real PostgreSQL** (local Supabase in CI) — every
   server endpoint for save, preview data, publish, history and role management,
   called as each test account:
   - allowed actions succeed and write exactly the expected rows and audit events;
   - every refused action returns 403/404 **and leaves the database unchanged**
     (row counts and `draft_version` compared before and after);
   - **revocation:** sign in as Ana, revoke her role, then reuse the same session
     for save and publish → refused;
   - **cross-complex tampering:** Ana sends B's id or slug in the URL or body → refused;
   - **forbidden fields** in the body (slug, name, published revision) → ignored or
     refused;
   - **stale version:** save with an old `draft_version` → conflict; publish after
     the draft changed since preview → conflict;
   - **draft leakage:** a unique marker string saved in a draft never appears in the
     public page response until published;
   - **database layer:** the browser-facing roles get no access to application tables
     through the REST API; the server role cannot update or delete revisions or
     audit events.
4. **End-to-end tests (Playwright, real browser)** — Ana signs in with a code from
   the local test mailbox, edits, saves, reloads to confirm persistence, previews,
   publishes, and an anonymous browser sees the change. Ben is refused A's editor.
   Ana is revoked while her editor tab is open; her next save shows a clear
   "you no longer have access" message and nothing changes.
5. **Rendered checks** — screenshots of the public page, editor and preview at
   390×844 and 1440×900 attached to the PR; automated no-horizontal-scroll check;
   axe accessibility scan; a keyboard-only run of the publish flow.

### 10.3 Manual checks before calling M1 done
- Repeat the end-to-end flow on staging with fictional data, on a real phone and a
  desktop browser.
- Review server logs from that run for codes, tokens or cookies.
- Review the PR's implemented / mocked / untested / unfinished list.

Commands will be added to `docs/engineering.md` only after they exist and run.

## 11. How the shared backend will support the Expo app

What is shared from the start:
- **One API.** The editor calls versioned JSON endpoints (`/api/v1/...`) — the same
  ones a phone app would call — instead of web-only shortcuts. Web pages may render
  data on the server, but every change goes through these endpoints.
- **One rule book.** Authorization and validation live in `packages/core` and
  `packages/schemas`, used by the server and, for form hints, by both clients.
- **One identity.** Supabase Auth issues the same user id to web and app. The web
  sends an HTTP-only session cookie; the app will send a bearer token stored in the
  phone's secure storage. M1 builds the API to accept both and has integration
  tests for the bearer path, even though no app exists yet. Cookie-based changes
  are also protected against cross-site requests (SameSite cookies plus an Origin
  check).

Backend changes we **expect** when app work starts (this is not a zero-change promise):
1. Push notifications: storing device tokens and sending notifications.
2. Phone photo uploads: camera images (including HEIC), larger files, retries on
   weak connections.
3. Universal / app links: files the website must serve so links open in the app.
4. API adjustments found while building phone screens (pagination, combined
   endpoints, smaller responses).
5. A minimum supported app version, so old app builds can be asked to update when
   the API changes.
6. Rate limits and abuse protection tuned for app traffic.
7. Possibly offline-friendly endpoints for front-desk and cleaning staff.

## 12. Questions that block this milestone

1. **Stack and spend.** Do you approve the recommended stack (§7.1) and roughly
   $45–55/month for staging and production? Should the Vercel, Supabase and Resend
   accounts be created in your name or your business's name, with you as owner?
2. **Domain.** Do you own a domain for Booking LT? Sign-in emails need a domain we
   can verify for sending. Staging can use a free Vercel address until then.
3. **Languages.** Must complex page content be in both **Spanish and English** at
   launch? If so, which is the default, and can a page be published with only one
   language filled in (the other showing the default)?
4. **Photos.** Should photo upload be part of Milestone 1 (slice M1.3), or come
   right after it? A page without photos is usable for testing, but not for showing
   to complexes.

Answers to these change the data model or the work plan. Everything else uses the
defaults in this document unless you say otherwise.

## 13. Decisions deferred (documented, not needed now)

- Platform admins editing page content directly (default here: no; use an audited
  temporary role).
- Whether complex admins can invite and manage their own team.
- Custom domains per complex; map provider; social-sharing images.
- Unpublishing a whole page; restoring an older revision from the UI.
- Product-wide dark mode.
- Which details front-desk staff see in arrivals (waits on open decision 6).
- Error monitoring vendor (required before launch, per `engineering.md` §9).

## 14. Implementation slices after approval

Each slice is its own branch and pull request, reviewed before the next starts.

| Slice | Contents | Done when |
| --- | --- | --- |
| M1.1 Foundation | Workspace, Next.js app, Drizzle schema and migrations, local Supabase, CI, email-code sign-in, platform-admin bootstrap command, minimal complex and role admin screen, authorization module with its full test table | Criteria 1–3, 14 (role screens), 17, 20 pass in CI |
| M1.2 Page draft and publish | Editor, save with version check, preview, publish, revisions, public page, audit events, end-to-end tests | Criteria 4–16, 18–19 pass |
| M1.3 Photos (if approved) | Upload, processing, private drafts, public copies at publish | Criteria 22–24 pass |
| M1.4 Staging | Staging deploy, fictional seed data, screenshots, manual checks | Criterion 21; §10.3 complete |

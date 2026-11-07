# Booking LT — Product Brief

Status: **Draft for review.** This document records the product requirements and
decisions approved so far. Anything listed under [Open decisions](#8-open-decisions)
is not decided and must not be assumed by design or code.

Last updated: 2026-11-06

---

## 1. Vision

Booking LT is a vacation rental marketplace **and** operations platform built
around condominium complexes.

- Start with one or two complexes in the Dominican Republic (Beach Residences is
  the first known complex). Further complexes are added manually by platform
  administrators; the model must allow geographic expansion later.
- Individual **hosts own the condos**. **Complex administrators** run the complex
  and its operations; they do **not** automatically control owners' listings.
- One product, three surfaces: a responsive **website** and **one shared Booking LT
  mobile app** for iOS and Android. All surfaces use the same backend, accounts,
  permissions and data. A person never needs a second account for a second role.
- Each complex has its own **branded public page** and its own **workspace**
  inside the platform.

## 2. Core concepts

| Concept | Meaning |
| --- | --- |
| Platform | Booking LT itself, operated by platform administrators. |
| Complex | A condominium complex (e.g. Beach Residences). Has a public page, rules, amenities, announcements and a staff workspace. |
| Property | A physical condo inside a complex, owned by one or more hosts. |
| Rentable unit / configuration | What a guest actually books: a whole property, or a smaller unit sharing the same physical space (e.g. a lock-off). Configurations of one property share inventory. |
| Listing | The public, bookable presentation of a rentable unit: photos, description, amenities, pricing, availability, rules. |
| Listing draft | A private listing prepared by a platform administrator for an owner to claim. Never bookable until claimed, verified and published. |
| Reservation | A stay. Either a **direct booking** made on Booking LT, or an **external reservation** (Airbnb, other channels, direct-to-owner) registered manually so complex staff can see it. |
| Guest registration | The structured record of who is staying, required by the complex. Replaces emailed guest lists. |
| Role assignment | A grant of a role to a person **for a specific scope** (platform, complex, or property). |

## 3. User roles

Every role is designed from the start, but features ship progressively (see
[Phased scope](#6-phased-scope)). One person may hold several roles across
different properties and complexes — e.g. a host of one condo, a cohost of
another, and a guest elsewhere. **Permissions are always derived from the
specific relationship, never from a global "type of user".**

1. **Guest** — editable profile; browse listings and complexes; book and pay;
   view, change and cancel reservations; complete guest registration; message hosts.
2. **Host** — editable public profile and listing pages; manage photos,
   descriptions, amenities, pricing, availability, house rules, reservations,
   messages and earnings. May manage multiple properties, potentially in
   different complexes.
3. **Cohost** — acts on specific properties with **host-granted, revocable,
   per-responsibility permissions** (e.g. "manage calendar and messages" but not
   "view earnings" or "edit pricing"). Revocation takes effect immediately.
4. **Complex administrator** — edits the complex public page, rules, amenities and
   announcements; sees booking summaries, arrivals and departures, guest
   registration records and complex commission reporting **for their complex
   only**. Does not edit owners' listings by default.
   - **Front-desk staff** — a narrower complex role: typically arrivals,
     departures and the guest registration details needed for check-in. No
     commission or financial reporting, no page editing.
5. **Cleaner** — sees assigned cleaning jobs, works through checklists, marks
   completion, reports issues (with photos).
6. **Maintenance staff** — sees assigned requests, schedules, progress and
   resolution notes.
7. **Platform administrator** — manually adds complexes; manages users; prepares
   and manages listing drafts; verifies listing claims; supports reservations;
   oversees commission agreements and payment reconciliation. Platform admin
   actions are audited.

Who assigns cleaners and maintenance staff (host, complex, or both) is an
[open decision](#8-open-decisions).

## 4. Key workflows

### 4.1 Listing creation and claiming
- **Self-service:** a host creates a property and listing in their own account;
  no invitation or claim of an administrator's draft is required. Publication
  requires verification of ownership or authority to manage the property. The
  evidence and method for confirming the complex relationship remain open decisions.
- **Admin-prepared draft:** a platform administrator prepares a **private** listing
  draft and sends the owner or authorized manager an **invitation**. The recipient
  accepts, completes verification, and a platform administrator approves the claim.
  Only then can the host publish.
- **Claim invitations:** bind each invitation to the intended recipient and draft;
  validate it on the server, give it an expiration, make it single-use, and allow
  revocation. Possessing a link alone does not prove ownership.
- **Invariant:** administrator-prepared drafts remain private and unbookable until
  claimed, verified and published. Self-service drafts remain private and
  unbookable until the host's authority is verified and the listing is published.
  Enforce these conditions on the server.
- **Separate concerns:** ownership/claim verification and listing publication are
  distinct states. Both onboarding paths support unpublishing and republishing
  without repeating an invitation; publication always rechecks current authority.

### 4.2 Airbnb-link-assisted onboarding (feasibility unresolved)
Desired: a host pastes their Airbnb listing link to speed up onboarding.
**Feasibility is unresolved.** We must not assume that importing content
(text, photos) or synchronizing availability is technically permitted or
available. Before design work, investigate: Airbnb's terms of service and API
access, whether iCal calendar export/import is sufficient for availability, and
copyright of listing photos. The fallback is manual entry with a good form.

### 4.3 Guest registration (replaces emailed lists at Beach Residences)
Today, hosts email guest names and rental dates to Beach Residences management.
Booking LT replaces that with **structured guest registration**:
- One registration per reservation (direct or external), listing the guests and
  the stay dates, plus whatever details the complex requires (fields configurable
  per complex; exact fields are an open decision, subject to legal review).
- **Submission and correction:** the booking guest can view, submit and correct
  the guest names for their own reservation. Hosts and cohosts with explicit
  guest-registration permission can enter, review and correct records for their
  assigned properties, including external stays whose guests have no platform account.
- **Completeness and review are separate:** track missing / incomplete / complete
  information separately from pending host review / reviewed. A host or authorized
  cohost reviews the submitted roster before it becomes the roster shared with
  complex staff. Material edits to the guest names or stay dates require review again.
- **Complex access:** authorized staff see readiness status and the latest
  host-reviewed roster only for their complex. When edits await review, identify
  that status and the version/date of the last reviewed roster rather than
  presenting pending changes as approved.
- **Change tracking:** record who submitted, corrected and reviewed each version
  and when. Limit history to each role's authorized scope and necessary fields.
- **Access boundaries:** guests access only their own reservation; hosts and
  permitted cohosts access only assigned properties; complex staff access only
  necessary records for their complex. Front-desk staff see the minimum needed
  for arrivals. Platform support access is separately authorized and audited.

### 4.4 Manual registration of external reservations
Hosts (and permitted cohosts) can record reservations made on Airbnb or other
channels so the complex sees all arrivals and departures in one place. External
reservations also block availability on Booking LT. Whether complex staff may
create external reservations themselves is an open decision.

### 4.5 Complex public pages
Each complex has a branded public page: description, photos, amenities, rules,
location, available listings, announcements. Separate sections for:
- **Properties for sale**, and
- **Preconstruction projects**,
initially **information plus an enquiry form** only (no transactions).

### 4.6 Shared physical space
A property may be rented as a whole **or** as smaller units sharing the same
physical space. Availability must eventually prevent overlapping reservations
across these configurations (booking the whole blocks each part; booking a part
blocks the whole). This must be designed into the data model from the start,
even if the first listings are simple.

### 4.7 Commission and payments
- Complex partners earn a **booking commission**. The **final allocation between
  host, complex and platform is undecided.**
- **Pagadito** split-payment testing is underway, but the commission allocation
  still has an unresolved issue. **The Pagadito integration is not verified.**
- **Provider-managed allocation is required:** the provider routes the agreed
  shares to the host, complex and platform under its supported arrangement.
  Booking LT must not receive the entire payment into its own merchant or bank
  account for onward distribution. Any change to this funds-flow model requires
  the product owner's explicit approval.
- **Payment processing** (moving money) and **commission accounting** (who is
  owed what, recorded in our own ledger) are separate concerns. An internal ledger
  entry does not prove that funds were transferred or settled. The payment
  provider must be replaceable.
- Reconciliation, refunds and payment retries are platform-admin responsibilities
  and must be designed carefully before payments go live.

## 5. Design direction

- **Apple-inspired** visual clarity, typography and generous spacing, combined with
  **Airbnb-inspired** booking usability (search, date picking, clear prices,
  trustworthy checkout). The design must be **original** — no copying of either
  brand's assets, layouts or identity.
- Accessible by default: target WCAG 2.2 AA (contrast, keyboard use, screen
  readers, touch target sizes, reduced motion).
- Hosts and complex administrators get **simple editing interfaces** for their
  public pages (edit in place / preview before publish).
- Operational dashboards (arrivals, registrations, cleaning, maintenance) should
  feel approachable, not like enterprise software.
- **Representative desktop and mobile designs are presented for review before the
  full interfaces are implemented.**
- Reusable visual rules (typography, widths, spacing, radii, gallery behaviour)
  live in [design.md](design.md).

## 6. Phased scope

Phases are a proposal; each is split into small, testable milestones that connect
frontend, backend and database. Order may change after review.

| Phase | Focus | Notes |
| --- | --- | --- |
| 0 | Documentation, domain & permission model, stack decision, representative designs | Planning and static designs preserved from PR #2. |
| 1 | **Complex module** | Accounts, platform admin adds a complex, complex roles (admin, front desk), editable branded complex page, rules, amenities, announcements. Milestone 1 (edit, preview and publish the complex page) is proposed in [milestones/m1-complex-page.md](milestones/m1-complex-page.md). |
| 2 | Hosts, properties and listings | Host profiles, properties linked to complexes, listing editing, admin-prepared drafts with invitation + claim verification, cohost grants. |
| 3 | Guest registration and arrivals | External reservation entry, structured guest registration with completeness and change history, arrivals/departures for complex staff. Replaces the Beach Residences email workflow. |
| 4 | Direct booking (without live payments) | Search, availability with shared-inventory rules, reservations, guest profiles, host–guest messaging. Payments mocked and clearly labelled. |
| 5 | Payments and commission accounting | Provider integration behind an interface, internal commission ledger, refunds, retries, reconciliation. Requires the commission decision and a payment/security review. |
| 6 | Operations | Cleaning jobs and checklists, maintenance requests, issue reporting. |
| 7 | Sales and preconstruction sections, Airbnb-assisted onboarding (if feasible), additional complexes/regions | Sales/preconstruction info pages may move earlier if wanted for the complex page. |

### Current implementation status

| Area | Status |
| --- | --- |
| Product and engineering documentation | Shared requirements; updated for Claude building / Codex reviewing |
| Milestone 1 plan and design previews ([docs/milestones/m1-complex-page.md](milestones/m1-complex-page.md)) | M1.1 approved; later slices deferred. Previews are static mock-ups with fictional content |
| Application foundation | M1.1 implementation; see [development.md](development.md) for verification and service setup |
| Pagadito integration | **External testing underway; not verified; not in this repository** |

This table must be kept honest: mark items as implemented, mocked, untested or
unfinished. Never call the product bug-free or production-ready without evidence.

## 7. Approved decisions

1. Single backend, single account system and single permission model shared by
   the website and one iOS/Android app.
2. Permissions are scoped to specific complexes and properties, not global user types.
3. Complex administrators do not control hosts' listings by default.
4. Unclaimed administrator-prepared listing drafts are never bookable.
5. Payment processing is separate from commission accounting; the payment
   provider is replaceable.
6. Development starts with the complex module, after its scope is approved.
7. Provider-managed payment allocation is required. Collecting the full payment
   in the platform account for onward distribution is outside the approved model;
   changing it requires explicit product-owner approval.

8. M1.1 application foundation and TypeScript, Next.js, Supabase, Drizzle, Zod,
   Vitest and Playwright approved on 2026-11-05. Vercel is the planned web host;
   Resend will deliver Supabase email codes when configured. No approval for later
   slices or spending.
9. As of 2026-11-06, Claude is the primary builder and Codex independently reviews.
   Preserve the original Claude mockups as the preferred visual direction. Existing
   M1.1 implementation remains available for assessment and reuse; changing builders
   does not authorize a rewrite, merge, paid resources or production deployment.

## 8. Open decisions

Numbered so they can be answered by number.

1. **Commission allocation** between host, complex and platform — percentages,
   who bears payment fees, and on what base (nightly rate, cleaning fee, taxes?).
2. **Pagadito split-payment issue** — resolve the missing platform commission in
   the existing two-party test and confirm a supported provider-managed allocation
   to the host, complex and platform. Three-recipient support remains unverified;
   do not substitute central collection and manual payouts.
3. **Commission on external reservations** — do complexes earn anything on
   Airbnb/other-channel stays that are only registered for operations?
4. **Second launch complex** — which one, and timing.
5. **Airbnb-assisted onboarding** — feasibility under Airbnb terms; acceptable
   fallback (iCal sync only? manual entry only?).
6. **Guest registration fields and retention** — which guest details the complex
   needs (e.g. ID document numbers?), how long they are kept, and Dominican
   Republic legal requirements (data protection, any authority reporting).
   Needs legal review.
7. **Ownership verification** — what evidence is acceptable to verify a listing
   claim (title deed, complex confirmation, other)?
8. **Host–complex link** — must a complex confirm that a self-registered host
   actually owns a unit in that complex before the listing appears on the complex page?
9. **Who assigns cleaners and maintenance staff** — hosts, complexes, or both;
   are they employed by the complex or independent?
10. **Who manages "for sale" and preconstruction entries** — complex admins,
    developers, owners, or platform admins? Who receives enquiries?
11. **Languages and currency** — Spanish and English? Prices in USD, DOP or both?
12. **Taxes and invoicing** — applicable taxes on stays and commissions, and who
    issues receipts/invoices.
13. **Cancellation and refund policies** — platform-wide, per host, or per complex.
14. **Brand** — the repository description says "booking rentals in LT"; confirm
    what "LT" refers to and whether "Booking LT" is the final product name.
15. **Service ownership and launch setup** — Vercel is planned; Supabase and Resend require development credentials and sending-domain setup. No paid resources authorized.

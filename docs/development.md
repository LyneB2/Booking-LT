# Booking LT — Development Guide

Status: **Draft.** The application does not exist yet. This guide covers the demo
dataset, which exists now, and the seed and reset rules the application must
follow once it is built. Commands are listed only once they have been run and verified.

Last updated: 2026-11-07

Related: product brief [product.md](product.md), engineering standards
[engineering.md](engineering.md), visual rules (including demo imagery)
[design.md](design.md).

---

## 1. Environments and data

| Environment | Data | Demo dataset allowed |
| --- | --- | --- |
| Development (your machine, CI) | Demo dataset plus test fixtures | Yes, loaded by default |
| Staging (and pull-request previews) | Demo dataset only | Yes |
| Production | Real data only | **Never** |

- Real people's data (guest names, owners, contacts) never goes into development or
  staging, and demo data never goes into production.
- Development and staging show a permanent banner: **"Demo environment —
  fictional data"**. Staging pages are hidden from search engines, and emails sent
  from staging start with `[Demo]`.
- Demo accounts are ordinary accounts with ordinary roles. Every change made in the
  interface goes through the real backend and the real permission checks. There is
  **no demo mode** that skips sign-in or authorization.
- Anything simulated (for example a payment provider sandbox) or planned is labelled
  as such in the interface.

## 2. The demo dataset

Location: `demo/`

| Path | Contents |
| --- | --- |
| `demo/dataset/manifest.json` | Version, date convention, what is covered now and what is planned |
| `demo/dataset/catalog.json` | Amenities, settings and brand presets used by the demo |
| `demo/dataset/complexes.json` | 6 complexes, each with its identity and the edge cases it represents |
| `demo/dataset/people.json` | 18 people: staff, future hosts, cohost, cleaner, maintenance, guests |
| `demo/dataset/roles.json` | Role assignments for the roles that exist in Milestone 1 |
| `demo/dataset/pages.json` | Complex page drafts and published revisions, in the Milestone 1 page format |
| `demo/dataset/media.json` | Photos: file path, subject, crop settings, AI prompt, and source (`crop-placeholder`, `placeholder`, `ai-generated` or `licensed`) |
| `demo/media/<complex>/` | Photo files: currently crops of the product owner's aerial photo, tagged "DEMO". The source and its usage limits are recorded in `manifest.json` → `placeholderSource` |
| `demo/tools/validate.mjs` | Consistency checks (see §3) |
| `demo/tools/make_placeholders.py` | Makes the placeholder photos (crops, or drawn scenes if the source photo is missing) |

### 2.1 Conventions
- **Fictional, realistic and consistent.** People have realistic names that reflect
  the area's mix of Dominican, French, Italian, North American and German residents
  and visitors. The same person keeps the same name, email, phone and relationships
  in every view and every module.
- **Contact details cannot reach real people.**
  - Emails use reserved `.example` domains.
  - Phone numbers use fictional ranges: `555 01xx` style numbers, or the UK's
    `07700 900xxx` drama range.
- **Geography.** The towns and beaches are real places in the Dominican Republic (Las
  Terrenas, Playa Bonita, Cabarete). The complexes, buildings and businesses are
  invented. Do not name a complex after a real one.
- **Keys.** Records use stable readable keys (`p_ana_rivas`, `cx_playa_serena`). The
  seed will turn each key into the same database id on every run.
- **Dates are relative** to the moment the seed runs. For example, `-10d@11:05`
  means ten days ago at 11:05 in Santo Domingo time. This keeps the demo current:
  arrivals stay "today" and history stays recent.
- **Text** has realistic lengths, in Spanish and English, and respects the product's
  limits. Some records sit deliberately near a limit or are missing a language.
- Every file starts with a `$notice` saying it is demo data.

### 2.2 Complexes

| Complex | Identity | Edge cases it covers |
| --- | --- | --- |
| Playa Serena Residences (Las Terrenas) | Busy, family-friendly beachfront complex; 42 condos | Published page with a newer unpublished draft; draft photo without alt text blocks publishing; revoked former admin; front-desk account |
| Bahía Almendro Condominiums (Playa Bonita) | Quiet boutique complex; 18 condos | Long list of 9 rules; both languages complete |
| Patio Las Garzas (town centre) | Small, colourful, budget; 12 apartments; no front desk | Only one photo; Spanish only; office hours instead of a front desk |
| Residencial Mirador del Atlántico Beach & Garden Condominiums | New hillside complex preparing its page | Long name; never published; incomplete draft; no photos; its admin also runs Playa Serena |
| Costa Ámbar Suites (Cabarete) | Kitesurf town on the north coast; 24 suites | About text near the 2,000-character limit; a second region |
| Altos de Cosón | Former pilot complex | Archived: public page not found despite having a revision |

### 2.3 People and roles in Milestone 1

| Person | Role now | Notes |
| --- | --- | --- |
| Lucía Fernández | Platform admin | Adds complexes, grants and revokes access |
| Ana Rivas | Complex admin: Playa Serena and Mirador del Atlántico | Two complexes, so she sees the complex switcher |
| Yokasta Mejía | Front desk: Playa Serena | Must be refused page editing |
| Héctor Batista | Former complex admin: Playa Serena (revoked) | Revocation case |
| Rafael Peña | Complex admin: Bahía Almendro | Former admin of archived Altos de Cosón |
| Wander Rosario | Front desk: Bahía Almendro | |
| Claire Dumont | Complex admin: Patio Las Garzas | Will also be a host there (several roles for one person) |
| Marco Bellini | Complex admin: Costa Ámbar | Will also host a condo at Playa Serena (several roles across complexes) |
| Tom Becker | Signed in, no role | "Signed in without permission" case |

Isabelle Moreau and Daniel Ortiz (hosts), Nicole Santana (cohost), Rosa Hernández
(cleaner), Julio Castillo (maintenance), and the guests Priya Nair, Emily Clarke,
María José Castillo and Lukas Weber already exist as people. Their future
relationships are written as narrative in `plannedRelationships` and become
structured data when their modules are designed.

### 2.4 Adding demo data for a new module
Do this when a module is designed or implemented, not before.

1. Reuse the existing people, complexes and places; add new ones only when a
   scenario needs them.
2. Include ordinary cases and the edge cases the module must handle, for example:
   - empty states;
   - long names;
   - missing photos;
   - incomplete guest registrations;
   - cancellations and partial refunds;
   - revoked cohosts;
   - external reservations;
   - overlapping requests for shared spaces.
3. Keep relationships consistent. A reservation's guest, host, property and complex
   must agree with every other file.
4. Extend `demo/tools/validate.mjs` with the module's consistency checks.
5. Update the tables in this section and `manifest.json` coverage.

## 3. Commands that exist now

Run from the repository root.

| Command | What it does | Verified |
| --- | --- | --- |
| `node demo/tools/validate.mjs` | Checks the dataset and exits with status 1 on any error | 2026-11-07, Node 22: passes. Fails as expected on injected HTML, a cross-complex photo, a publisher who was not an admin, a crop outside the source, an unknown tint and a missing `placeholderSource` |
| `python3 demo/tools/make_placeholders.py` | Regenerates placeholder photos: crops for `crop-placeholder` entries, or drawn scenes for `placeholder` entries and whenever the source photo is missing. Skips `ai-generated` and `licensed` photos. Requires Pillow | 2026-11-07, Python 3 with Pillow 12: 22 crops; the drawn-scene fallback also works when the source is removed |

The validator checks:
- that every key is unique and every reference resolves;
- that contact details are fictional;
- that role rules hold (platform admins have no complex; there are no duplicate
  active roles; archived complexes have no active roles);
- that whoever published or edited a page was a complex admin of that complex
  at that time;
- the page content limits, plain text only, known amenities and presets, and that
  no photo is used by another complex;
- that published revisions are complete;
- that every photo file exists, crop settings stay inside the source photo, and the
  source photo and its usage limits are declared.

It also lists the drafts that are intentionally unpublishable.

## 4. Seeding and resetting (planned for M1.1 — not built yet)

These commands do not exist yet. They are part of slice M1.1 in
[milestones/m1-complex-page.md](milestones/m1-complex-page.md) and will be
documented as verified only once they run.

### 4.1 Planned commands
- `pnpm demo:seed` validates the dataset, then loads it into the development (or
  staging) database, sign-in system and photo storage. Running it again updates
  the same records instead of duplicating them.
- `pnpm demo:reset` empties the application data, the demo sign-in accounts and the
  demo photo storage, re-applies database migrations, and runs `demo:seed`. This is
  the single way to get back to a known demo state.

### 4.2 Safeguards (all required before the commands are used)
1. The commands refuse to run unless `APP_ENV` is `development` or `staging`.
2. Each database records its own environment in a one-row settings table, written
   when the database is first set up. The commands read that row and refuse unless
   it matches `APP_ENV` and is not `production`. A wrong environment variable alone
   cannot cause damage.
3. `DEMO_DATA_ALLOWED=true` must be set. It exists only in the development and
   staging configuration; production never has it.
4. On staging, the command also requires `--confirm staging` and prints the target
   database and project before doing anything.
5. Every seed and reset writes an audit event (who, when, which dataset version).
6. An automated test checks that the commands refuse when the database says
   `production`.
7. On staging, the seed refuses to upload any photo whose source rights are not
   confirmed. Today that means every `crop-placeholder` (see `manifest.json` →
   `placeholderSource.rightsConfirmed`). Staging needs AI-generated or licensed photos,
   or the drawn placeholders.

### 4.3 Signing in as a demo person
- **Development:** sign-in codes are caught by the local mail viewer that comes with
  the local database stack, so any demo account can sign in.
- **Staging:** open decision. `.example` addresses cannot receive mail. The
  recommendation is a catch-all mailbox on a domain you control, configured
  only for staging. There will be no password-less backdoor.

## 5. Open items
1. How reviewers sign in as demo people on staging (§4.3).
2. Replacing the crop placeholders with AI-generated or licensed images before
   staging, or confirming the rights to the source photo. Prompts are ready in
   `media.json`; no image-generation tool is connected in this repository's workflow.

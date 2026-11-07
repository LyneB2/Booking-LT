# Booking LT — Design Rules

Status: **Draft.** These are the reusable visual rules for every Booking LT screen,
public and management alike. The product owner set the direction on 2026-11-07:
- one sans-serif family;
- calmer headings within the stated size ranges;
- a contained gallery about 1,200 px wide with 20–24 px corners;
- one large photo plus four smaller ones, a "Show all photos" action, and no empty tiles;
- a swipeable gallery with a counter on phones.

The exact values below are proposals shown in the revision 2 preview, waiting for
review. The product brief is in [product.md](product.md); engineering standards
are in [engineering.md](engineering.md).

Last updated: 2026-11-07

- Live preview: [`design/previews/m1-complex-page.html`](../design/previews/m1-complex-page.html)
  (tab 1, "Public page — revision 2")
- Screenshots: [`design/previews/screenshots/`](../design/previews/screenshots/) —
  `public-desktop.png`, `public-mobile.png`, `public-gallery-states.png`
- Reference screenshots from the product owner (an Airbnb listing and a
  MyLasTerrenas page): to be saved in [`docs/design-references/`](design-references/).
  **Not yet in the repository**, because the images did not arrive with the request.

---

## 1. Principles

1. **Clarity first.** Apple-like restraint (generous space, few weights, clear
   hierarchy) combined with Airbnb-like usefulness (photos up front, obvious actions).
2. **Original identity.** We borrow layout ideas, not branding: no copied logos,
   icons, colours or wording.
3. **One system.** Public pages and management screens share the type scale,
   spacing, radii and colour tokens.
4. **Accessible by default.** Target WCAG 2.2 AA: contrast, keyboard use, visible
   focus, touch targets of at least 44 × 44 px, alt text, and respect for reduced motion.
5. **Honest states.** Unfinished features are hidden or clearly labelled "coming
   later". Previews say what is only designed and what actually works.

## 2. Typography

- **Family:** Inter, at weights **400, 500 and 600 only**. The product will
  self-host the font files rather than load them from a font service.
  Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif`.
- **Body text is regular weight (400).** Use 600 for headings, 500 for labels,
  buttons and emphasised values. Never use 700 or heavier.
- Numbers that line up in columns (prices, counts, dates) use tabular figures.

| Role | Desktop | Phone (≤ 760 px) | Weight | Notes |
| --- | --- | --- | --- | --- |
| Page title (complex or listing name) | 40 px / 1.15 | 30 px / 1.2 | 600 | Letter-spacing −0.022em. Names over 30 characters: 36 px desktop, 28 px phone. Lines are balanced and names are never cut off. |
| Section heading (H2) | 22 px / 1.3 | 20 px / 1.3 | 600 | Letter-spacing −0.012em |
| Card / sub-heading (H3) | 18 px / 1.35 | 18 px / 1.35 | 600 | |
| Lead text (tagline) | 18 px / 1.5 | 16 px / 1.5 | 400 | Secondary colour |
| Body | 16 px / 1.6 | 16 px / 1.6 | 400 | Reading width at most 65 characters |
| Small / secondary | 14 px / 1.5 | 14 px / 1.5 | 400 | Secondary colour |
| Label, button, badge | 13–15 px / 1.4 | same | 500 | Uppercase only for short badges, with +0.04em letter-spacing |
| Form input text | 16 px | 16 px | 400 | Prevents phones from zooming in on focus |

**Secondary text** uses a darker grey than usual so it stays easy to read:
the `--text-2` token is `#475655` on white (about 7:1 contrast) in light mode and
`#B3C1BF` in dark mode. Placeholder or disabled text must still meet 4.5:1 where it
conveys information.

## 3. Colour

- Neutrals are slightly tinted toward the brand teal rather than pure grey.
- The complex's brand colour comes **only** from presets (Lagoon, Harbour, Clay,
  Palm, Dusk). Each preset is checked for at least 4.5:1 contrast against text in
  light and dark mode. Admins cannot enter arbitrary colours.
- Status colours (green, amber, red) are separate from the brand colour and always
  come with text, never colour alone.
- Token names and values currently live in the preview file. They move into the
  application's shared styles when the web app is built.

## 4. Layout and content width

| Item | Rule |
| --- | --- |
| Content container | Max **1,200 px** of content, centred. Header, title, gallery, body and footer all align to it. |
| Side gutters | **40 px** above 1,100 px wide; **32 px** from 761 to 1,100 px; **20 px** at 760 px and below |
| Breakpoints | Phone ≤ 760 px · compact 761–1,100 px · desktop > 1,100 px |
| Public page body | Main column plus a **340 px** side card (300 px when compact), 64 px apart (40 px when compact). One column on phones, with the side card after the main content. |
| Reading width | Paragraphs at most 65 characters wide |
| Management screens | Same type, spacing and radii. Layout widths for the editor and dashboards will be set when the pattern is applied there, after approval. |

## 5. Spacing

Use a 4 px base scale: **4, 8, 12, 16, 20, 24, 32, 40, 48, 64**.

- Title block: 32 px above, 24 px below on desktop; 20 px and 16 px on phones.
- Gallery to body: 40 px desktop, 24 px phone.
- Between page sections: 32 px desktop, 24 px phone, separated by a 1 px divider.
- Inside cards: 24 px desktop, 16–20 px phone.
- Group siblings with layout gaps rather than one-off margins.

## 6. Corner radii

| Element | Radius |
| --- | --- |
| Photo gallery, desktop (outer corners only) | **22 px** |
| Photo gallery, phone | **20 px** |
| Cards, panels, map, dashed "coming later" boxes | 16 px |
| Inputs, small buttons such as "Show all photos" | 10 px |
| Primary and secondary buttons, pills, badges | fully rounded (999 px) |
| Complex logo tile | 8 px |
| Photo tiles inside a gallery | 0. The gallery container rounds and clips the outer corners. |

## 7. Photo gallery

### 7.1 Desktop and compact widths
- Sits inside the content container, aligned with the title. It does not run to
  the screen edges.
- The gallery is about 2.15 : 1 (width : height) and at most 560 px tall. Tiles
  are separated by **8 px** gaps.
- Layout depends on how many photos there are. **No empty tiles are ever shown.**

| Photos | Layout | "Show all photos" |
| --- | --- | --- |
| 0 | No gallery. The title block is followed directly by the content. | — |
| 1 | One wide image, 2.4 : 1 | Hidden |
| 2 | Two equal halves | Shown |
| 3–4 | One large image (left, two-thirds) plus two stacked images | Shown; the 4th photo appears only in the full gallery |
| 5 or more | One large image plus four smaller images in a 2 × 2 grid | Shown |

- **"Show all photos"** sits at the bottom-right of the gallery: a white button
  with a dark 1 px border and a grid icon. *Designed behaviour (not built):*
  - opens a full-screen gallery listing every photo in order;
  - selecting one opens a single-photo view;
  - arrow keys and swipe move between photos, Esc closes;
  - focus stays inside the gallery while it is open and returns to the button
    when it closes.
- Clicking any tile opens the full-screen gallery at that photo *(designed, not built)*.
  On devices with a mouse, the hovered tile darkens by about 8 %.

### 7.2 Phones (≤ 760 px)
- A swipeable gallery with one photo at a time, 4 : 3, **20 px** corners, inset by
  the 20 px page gutter.
- Photos snap into place as you swipe. A counter at the bottom-right shows
  "current / total" (for example "1 / 5") on a dark translucent pill. Screen readers
  hear the change politely, without interrupting.
- There is no "Show all photos" button on phones. Tapping a photo opens the
  full-screen gallery *(designed, not built)*.
- The same behaviour applies whatever the photo count. With one photo there is no
  counter.

### 7.3 Cropping and photo data
- Photos fill their tile without distortion, and the crop is centred on each photo's
  **focal point** (horizontal and vertical percentages, default 50 % / 50 %), so the
  important subject stays in frame at every size. The admin will set the focal point
  in the editor by tapping the subject. That control is not designed yet.
- Each photo stores its order, focal point and alt text for each content language.
  The cover photo is first. Publishing is refused while any photo lacks alt text.
- Upload guidance: at least 1,600 px on the long side, ideally 2,400 px or more.
  Smaller images look soft in the large tile.
- Performance: the first photo loads immediately; the others load as needed. The
  server provides sized versions so phones do not download desktop images.

## 8. Demo content and imagery

Previews, development and staging use **realistic, consistent fictional content by
default**, so every screen can be experienced as if it were populated. The content
comes from the shared demo dataset; [development.md](development.md) §2 describes
it and how it is reset.

### 8.1 Text and people
- Use the dataset's cast and complexes, such as Ana Rivas at Playa Serena Residences
  or Rafael Peña at Bahía Almendro, rather than inventing new names for each screen.
  The same person, property and booking must read identically in every account's view.
- Use realistic lengths, both languages where the product supports them, and real
  formats for dates, prices and phone numbers. Never use lorem ipsum.
- Every screen design shows its edge cases alongside the ordinary case: empty states,
  long names, missing photos, incomplete information, cancellations.

### 8.2 Photos
- **AI-generated images are welcome for demo content.** Each demo photo in
  `demo/dataset/media.json` has a ready-to-use prompt for replacing its placeholder.
- **Current placeholders are crops** of one aerial photo supplied by the product
  owner. Each crop is mirrored or tinted per complex and carries a small "DEMO" tag
  in its bottom-left corner.
  - The subject, alt text and prompt of each photo describe what the crop actually
    shows.
  - The photo's rights are unconfirmed, so crop placeholders are for **development and
    internal previews only**. They are never uploaded to staging or production.
  - Every complex shows the same place, and small crops look soft at large sizes.
    Both are acceptable for placeholders.
  - If the source photo is missing, drawn scenes are used instead. Those carry a
    "DEMO PHOTO · PLACEHOLDER" band.
- Style, so the platform stays believable:
  - photorealistic, natural daylight or golden hour;
  - Dominican Republic north-coast settings: palm-lined beaches, turquoise bays,
    green hills;
  - low-rise condominium complexes of three to five storeys, with white or pastel
    walls, tiled or dark roofs, gardens and pools, rather than mega-resorts or towers;
  - local towns with colourful, modest buildings.
- Each complex keeps a consistent look across its photos, matching its identity in
  `complexes.json`. For example, Bahía Almendro has dark wood and stone, and Patio
  Las Garzas has coral and turquoise walls.
- Never show:
  - recognisable real complexes, signs, brands or logos;
  - text or watermarks;
  - identifiable faces, licence plates or house numbers.
- Size: 3 : 2, at least 2,400 px on the long side; WebP or JPEG; no location metadata.
- Record each image's `source`: `crop-placeholder`, `placeholder` (drawn),
  `ai-generated` with the tool name, or `licensed` with the licence.
- Real photographs of real places or people go into demo data only with written
  permission, recorded in `media.json`.
  - **Exception:** the product owner's aerial photo, described above, is used in the
    design preview and as the source of the crop placeholders. It is for development
    and internal review only, and must not reach staging or production until its
    rights are confirmed.

### 8.3 Labelling
- Development and staging show a permanent "Demo environment — fictional data"
  banner. Design previews say at the top that their content is fictional.
- Features that are only planned or simulated are labelled "Coming later",
  "Design preview" or "Simulated" wherever they appear. They never look like
  working features.

## 9. Status of these rules

| Rule | Status |
| --- | --- |
| Typography, widths, spacing, radii | **Designed** — shown on the revision 2 public page preview only |
| Gallery layouts for 1, 2, 3–4 and 5+ photos | **Designed** — static examples in the preview |
| Swipe and counter on phones | **Works in the mock-up only** (browser scrolling and a small script); not built in the product |
| "Show all photos" and the full-screen gallery | **Designed only** — the preview button does nothing |
| Focal-point cropping | **Shown** with fixed values; editor control not designed; not built |
| Editor, preview-and-publish, arrivals screens | **Not yet updated** to these rules; waits for approval of revision 2 |
| Demo dataset and placeholder photos | **Exists** in `demo/`; checked by `node demo/tools/validate.mjs`. Photos are crop placeholders (development and internal previews only); AI images not generated yet |
| Application code | **Not started** |

## 10. Changing these rules

Propose changes in a pull request that updates this file and the preview together,
with desktop and phone screenshots. Keep product requirements in `product.md` and
engineering rules in `engineering.md`; this file covers visual and interaction
design only.

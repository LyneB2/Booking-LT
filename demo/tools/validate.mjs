// Checks the demo dataset for consistency. No dependencies.
// Usage (from the repository root):  node demo/tools/validate.mjs
// Exits with status 1 if any error is found.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DS = join(ROOT, "demo", "dataset");
const errors = [];
const notes = [];
const err = (m) => errors.push(m);
const load = (f) => {
  const data = JSON.parse(readFileSync(join(DS, f), "utf8"));
  if (!String(data.$notice || "").startsWith("DEMO DATA")) err(`${f}: missing "DEMO DATA" $notice`);
  return data;
};

const manifest = load("manifest.json");
const catalog = load(manifest.files.catalog);
const { complexes } = load(manifest.files.complexes);
const { people } = load(manifest.files.people);
const { roleAssignments } = load(manifest.files.roles);
const { pages } = load(manifest.files.pages);
const { media } = load(manifest.files.media);

// Relative dates: "-10d", "+3d", optional "@HH:MM". Returns days as a number for ordering.
const rel = (s, where) => {
  const m = /^([+-]\d+)d(?:@([01]\d|2[0-3]):([0-5]\d))?$/.exec(String(s));
  if (!m) { err(`${where}: bad relative date "${s}"`); return NaN; }
  return Number(m[1]) + (m[2] ? (Number(m[2]) * 60 + Number(m[3])) / 1440 : 0);
};

// Unique keys across all entity types
const seen = new Map();
for (const [type, list] of [["complex", complexes], ["person", people], ["role", roleAssignments], ["media", media]]) {
  for (const x of list) {
    if (!/^[a-z][a-z0-9_]+$/.test(x.key)) err(`${type} key "${x.key}" is not lowercase_snake`);
    if (seen.has(x.key)) err(`duplicate key "${x.key}"`);
    seen.set(x.key, type);
  }
}
const byKey = (list) => new Map(list.map((x) => [x.key, x]));
const C = byKey(complexes), P = byKey(people), Mx = byKey(media);

// Complexes
const slugs = new Set();
for (const c of complexes) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug) || c.slug.length < 3 || c.slug.length > 60) err(`${c.key}: bad slug`);
  if (slugs.has(c.slug)) err(`${c.key}: duplicate slug`); slugs.add(c.slug);
  if (!["active", "archived"].includes(c.status)) err(`${c.key}: bad status`);
  if (!P.has(c.createdBy)) err(`${c.key}: createdBy unknown`);
  if (c.countryCode !== "DO") notes.push(`${c.key}: outside the Dominican Republic`);
  rel(c.createdAt, c.key);
}

// People: fictional contact details only
const fictionalPhone = (p) => { const d = p.replace(/[^\d+]/g, ""); return d.includes("55501") || d.startsWith("+447700900"); };
const emails = new Set();
for (const p of people) {
  if (!/@[a-z0-9.-]+\.example$/.test(p.email)) err(`${p.key}: email must use a .example domain`);
  if (emails.has(p.email)) err(`${p.key}: duplicate email`); emails.add(p.email);
  if (!fictionalPhone(p.phone)) err(`${p.key}: phone is not in a fictional range`);
  rel(p.createdAt, p.key);
}

// Roles
const ROLES = ["platform_admin", "complex_admin", "front_desk"];
const active = new Set();
for (const r of roleAssignments) {
  if (!ROLES.includes(r.role)) err(`${r.key}: role "${r.role}" does not exist in Milestone 1`);
  if (!P.has(r.person)) err(`${r.key}: unknown person`);
  if ((r.role === "platform_admin") !== (r.complex === null)) err(`${r.key}: platform_admin must have no complex; other roles need one`);
  if (r.complex !== null && !C.has(r.complex)) err(`${r.key}: unknown complex`);
  if (r.grantedBy !== null && !P.has(r.grantedBy)) err(`${r.key}: unknown grantedBy`);
  const g = rel(r.grantedAt, r.key);
  if (r.revokedAt) {
    if (!P.has(r.revokedBy)) err(`${r.key}: revokedAt without a known revokedBy`);
    if (!(rel(r.revokedAt, r.key) > g)) err(`${r.key}: revoked before granted`);
  } else {
    const id = `${r.person}|${r.role}|${r.complex}`;
    if (active.has(id)) err(`${r.key}: duplicate active assignment`); active.add(id);
    if (r.complex && C.get(r.complex)?.status === "archived") err(`${r.key}: active role on an archived complex`);
  }
}
const wasAdminAt = (person, complex, when) => roleAssignments.some((r) =>
  r.person === person && r.complex === complex && r.role === "complex_admin" &&
  rel(r.grantedAt, r.key) <= when && (!r.revokedAt || rel(r.revokedAt, r.key) > when));

// Page content
const LIMITS = { tagline: 140, about: 2000, rule: 200, rules: 20 };
function checkContent(ct, cx, where, mustPublish) {
  const problems = [];
  if (ct.schemaVersion !== 1) err(`${where}: schemaVersion must be 1`);
  const langs = Object.keys(ct.text || {});
  if (!langs.length || langs.some((l) => !["es", "en"].includes(l))) err(`${where}: text languages must be es/en`);
  for (const l of langs) {
    const t = ct.text[l];
    for (const f of ["tagline", "about", "locationNote", "hours"]) {
      if (typeof t[f] !== "string") err(`${where}.${l}.${f}: must be a string`);
      else if (/[<>]/.test(t[f])) err(`${where}.${l}.${f}: plain text only`);
    }
    if (t.tagline?.length > LIMITS.tagline) err(`${where}.${l}.tagline: over ${LIMITS.tagline} characters`);
    if (t.about?.length > LIMITS.about) err(`${where}.${l}.about: over ${LIMITS.about} characters`);
    if (!Array.isArray(t.rules) || t.rules.length > LIMITS.rules || t.rules.some((r) => typeof r !== "string" || !r.trim() || r.length > LIMITS.rule)) err(`${where}.${l}.rules: invalid`);
    else if (t.rules.some((r) => /[<>]/.test(r))) err(`${where}.${l}.rules: plain text only`);
    if (!t.tagline || !t.about) problems.push(`${l}: tagline or about text missing`);
  }
  for (const a of ct.amenities || []) if (!catalog.amenities[a]) err(`${where}: unknown amenity "${a}"`);
  if (!catalog.brandPresets.includes(ct.brandPreset)) err(`${where}: unknown brand preset`);
  if (ct.highlights?.setting && !catalog.settings[ct.highlights.setting]) err(`${where}: unknown setting`);
  if (ct.contact?.email && !/\.example$/.test(ct.contact.email)) err(`${where}: contact email must use .example`);
  if (ct.contact?.phone && !fictionalPhone(ct.contact.phone)) err(`${where}: contact phone not fictional`);
  if (!ct.contact?.phone && !ct.contact?.email) problems.push("no public contact");
  for (const ph of ct.photos || []) {
    const m = Mx.get(ph.mediaId);
    if (!m) { err(`${where}: unknown photo ${ph.mediaId}`); continue; }
    if (m.complex !== cx) err(`${where}: photo ${ph.mediaId} belongs to another complex`);
    const { x, y } = ph.focal || {};
    if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) err(`${where}: photo ${ph.mediaId} focal point out of range`);
    for (const l of langs) if (!ph.alt?.[l]) problems.push(`photo ${ph.mediaId} has no ${l} alt text`);
  }
  if (ct.coverMediaId && !(ct.photos || []).some((p) => p.mediaId === ct.coverMediaId)) err(`${where}: cover is not one of the photos`);
  if (mustPublish && problems.length) err(`${where}: published revision is not publishable (${problems.join("; ")})`);
  return problems;
}

const paged = new Set();
for (const pg of pages) {
  const cx = pg.complex;
  if (!C.has(cx)) { err(`page for unknown complex ${cx}`); continue; }
  if (paged.has(cx)) err(`${cx}: more than one page`); paged.add(cx);
  let last = 0;
  for (const rv of pg.revisions) {
    const where = `${cx} revision ${rv.number}`;
    if (rv.number <= last) err(`${where}: revision numbers must increase`); last = rv.number;
    if (!wasAdminAt(rv.publishedBy, cx, rel(rv.publishedAt, where))) err(`${where}: publisher was not a complex admin at that time`);
    checkContent(rv.content, cx, where, true);
  }
  const d = pg.draft, where = `${cx} draft`;
  if (!wasAdminAt(d.updatedBy, cx, rel(d.updatedAt, where))) err(`${where}: editor was not a complex admin at that time`);
  if (d.content === "sameAsLatestRevision") {
    if (!pg.revisions.length) err(`${where}: no revision to be the same as`);
  } else {
    const problems = checkContent(d.content, cx, where, false);
    if (problems.length) notes.push(`${where} cannot be published yet (intended edge case): ${problems.join("; ")}`);
  }
  if (!pg.revisions.length) notes.push(`${cx}: never published, public page returns not found`);
  if (C.get(cx).status === "archived") notes.push(`${cx}: archived, public page returns not found`);
}
for (const c of complexes) if (!paged.has(c.key)) err(`${c.key}: no page entry`);

// Media files
for (const m of media) {
  if (!C.has(m.complex)) err(`${m.key}: unknown complex`);
  if (!["placeholder", "ai-generated", "licensed"].includes(m.source)) err(`${m.key}: bad source`);
  if (!existsSync(join(ROOT, m.file))) err(`${m.key}: file missing (${m.file}); run python3 demo/tools/make_placeholders.py`);
  if (!m.aiPrompt) err(`${m.key}: missing aiPrompt`);
}

const counts = `${complexes.length} complexes, ${people.length} people, ${roleAssignments.length} role assignments, ${pages.length} pages, ${media.length} photos`;
for (const n of notes) console.log(`note   ${n}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR  ${e}`);
  console.error(`\nDemo dataset has ${errors.length} error(s). (${counts})`);
  process.exit(1);
}
console.log(`\nDemo dataset OK: ${counts}.`);

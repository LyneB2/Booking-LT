import { pgSchema, uuid, text, timestamp } from "drizzle-orm/pg-core";
const booking = pgSchema("booking");
const time = (name: string) => timestamp(name, { withTimezone: true });
export const profiles = booking.table("profiles", {
  id: uuid().primaryKey(),
  disabledAt: time("disabled_at"),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const complexes = booking.table("complexes", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  countryCode: text("country_code").notNull().default("DO"),
  status: text().notNull().default("active"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: time("created_at").notNull().defaultNow(),
});
export const assignments = booking.table("role_assignments", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  role: text()
    .$type<"platform_admin" | "complex_admin" | "front_desk">()
    .notNull(),
  complexId: uuid("complex_id").references(() => complexes.id),
  grantedBy: uuid("granted_by")
    .notNull()
    .references(() => profiles.id),
  grantedAt: time("granted_at").notNull().defaultNow(),
  revokedBy: uuid("revoked_by").references(() => profiles.id),
  revokedAt: time("revoked_at"),
});
export const auditEvents = booking.table("audit_events", {
  id: uuid().primaryKey().defaultRandom(),
  occurredAt: time("occurred_at").notNull().defaultNow(),
  actorUserId: uuid("actor_user_id")
    .notNull()
    .references(() => profiles.id),
  action: text().notNull(),
  complexId: uuid("complex_id").references(() => complexes.id),
  subjectId: uuid("subject_id").notNull(),
});

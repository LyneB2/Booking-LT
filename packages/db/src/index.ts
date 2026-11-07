import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { authorize, AccessError, type Action } from "@booking-lt/core";
import { profiles, assignments, complexes, auditEvents } from "./schema";
import type { ScopedRole } from "@booking-lt/schemas";
export { profiles, assignments, complexes, auditEvents } from "./schema";
export function connect(url: string) {
  const client = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  return { db: drizzle(client), close: () => client.end() };
}
export type Database = ReturnType<typeof connect>["db"];
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
// Shared with bootstrap/disable. Low-volume foundation operations serialize with revocation.
export const authorizationLock = sql`select pg_advisory_xact_lock(18640, 1)`;
async function account(tx: Tx, id: string) {
  const [profile] = await tx.select().from(profiles).where(eq(profiles.id, id));
  if (!profile) return null;
  return {
    disabledAt: profile.disabledAt,
    assignments: await tx
      .select()
      .from(assignments)
      .where(eq(assignments.userId, id)),
  };
}
export async function protectedOperation<T>(
  db: Database,
  userId: string,
  action: Action,
  complexId: string | undefined,
  work: (tx: Tx) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(authorizationLock);
    const [complex] = complexId
      ? await tx.select().from(complexes).where(eq(complexes.id, complexId))
      : [];
    authorize(await account(tx, userId), action, complex);
    return work(tx);
  });
}
export function listComplexes(db: Database, userId: string) {
  return protectedOperation(db, userId, "platform.manage", undefined, (tx) =>
    tx.select().from(complexes).orderBy(complexes.name),
  );
}
export function newComplex(
  db: Database,
  userId: string,
  input: { name: string; slug: string },
) {
  return protectedOperation(
    db,
    userId,
    "platform.manage",
    undefined,
    async (tx) => {
      const [created] = await tx
        .insert(complexes)
        .values({ ...input, createdBy: userId })
        .returning();
      await tx
        .insert(auditEvents)
        .values({
          actorUserId: userId,
          action: "complex.created",
          complexId: created.id,
          subjectId: created.id,
        });
      return created;
    },
  );
}
export function getWorkspace(db: Database, userId: string, complexId: string) {
  return protectedOperation(
    db,
    userId,
    "complex.workspace",
    complexId,
    async (tx) => {
      const [complex] = await tx
        .select()
        .from(complexes)
        .where(eq(complexes.id, complexId));
      return { id: complex.id, name: complex.name, slug: complex.slug };
    },
  );
}
export function listRoles(db: Database, userId: string, complexId: string) {
  return protectedOperation(
    db,
    userId,
    "platform.manage",
    undefined,
    async (tx) => {
      if (
        !(await tx.select().from(complexes).where(eq(complexes.id, complexId)))
          .length
      )
        throw new AccessError(404);
      return tx
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.complexId, complexId),
            isNull(assignments.revokedAt),
          ),
        )
        .orderBy(assignments.grantedAt);
    },
  );
}
export function addRole(
  db: Database,
  actor: string,
  complexId: string,
  input: { userId: string; role: ScopedRole },
) {
  return protectedOperation(
    db,
    actor,
    "platform.manage",
    undefined,
    async (tx) => {
      const [complex] = await tx
        .select()
        .from(complexes)
        .where(
          and(eq(complexes.id, complexId), eq(complexes.status, "active")),
        );
      if (!complex) throw new AccessError(404);
      const target = await account(tx, input.userId);
      if (!target || target.disabledAt)
        throw new AccessError(403, "Choose an existing, enabled account.");
      const [grant] = await tx
        .insert(assignments)
        .values({ ...input, complexId, grantedBy: actor })
        .returning();
      await tx
        .insert(auditEvents)
        .values({
          actorUserId: actor,
          action: "role.granted",
          complexId,
          subjectId: grant.id,
        });
      return grant;
    },
  );
}
export function revokeRole(
  db: Database,
  actor: string,
  complexId: string,
  roleId: string,
) {
  return protectedOperation(
    db,
    actor,
    "platform.manage",
    undefined,
    async (tx) => {
      const [grant] = await tx
        .update(assignments)
        .set({ revokedAt: new Date(), revokedBy: actor })
        .where(
          and(
            eq(assignments.id, roleId),
            eq(assignments.complexId, complexId),
            isNull(assignments.revokedAt),
          ),
        )
        .returning();
      if (!grant) throw new AccessError(404);
      await tx
        .insert(auditEvents)
        .values({
          actorUserId: actor,
          action: "role.revoked",
          complexId,
          subjectId: grant.id,
        });
      return { id: grant.id };
    },
  );
}

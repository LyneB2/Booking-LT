import { beforeAll, afterAll, it, expect } from "vitest";
import postgres from "postgres";
import { NextRequest } from "next/server";
import {
  connect,
  newComplex,
  addRole,
  revokeRole,
  getWorkspace,
  protectedOperation,
} from "@booking-lt/db";
import { bootstrapAdmin } from "../../packages/db/src/bootstrap";
import { migrate } from "../../packages/db/src/migrate";
import { ids, seedUsers } from "../support/database";
import { makeHandler } from "../../apps/web/lib/api";
import type { authContext } from "../../apps/web/lib/auth";
const runtime = connect(process.env.TEST_DATABASE_URL!);
const owner = postgres(process.env.TEST_OWNER_URL!, { onnotice: () => {} });
let a: { id: string };
let b: { id: string };
let adminGrant: { id: string };
// Only identity verification is simulated; handler, authorization, SQL and permissions are real.
const auth = ((request: NextRequest) => ({
  userId: async () => {
    const id = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!Object.values(ids).includes(id!)) {
      const { AccessError } = await import("@booking-lt/core");
      throw new AccessError(401, "Please sign in.");
    }
    return id!;
  },
  apply: (r: unknown) => r,
})) as typeof authContext;
const handler = makeHandler({ db: () => runtime.db, auth });
async function request(
  path: string,
  actor?: string,
  method = "GET",
  body?: unknown,
  origin = "http://localhost:3000",
) {
  return handler(
    new NextRequest("http://localhost:3000/api/v1/" + path, {
      method,
      headers: {
        ...(actor ? { authorization: "Bearer " + actor } : {}),
        origin,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
}
beforeAll(async () => {
  process.env.APP_ORIGIN = "http://localhost:3000";
  await seedUsers(owner);
  await expect(
    bootstrapAdmin(process.env.TEST_OWNER_URL!, ids.disabled),
  ).rejects.toThrow("confirmed, enabled");
  await owner`update auth.users set email_confirmed_at = null where id = ${ids.none}`;
  await expect(
    bootstrapAdmin(process.env.TEST_OWNER_URL!, ids.none),
  ).rejects.toThrow("confirmed, enabled");
  await owner`update auth.users set email_confirmed_at = now(), banned_until = now() + interval '1 day' where id = ${ids.none}`;
  await expect(
    bootstrapAdmin(process.env.TEST_OWNER_URL!, ids.none),
  ).rejects.toThrow("confirmed, enabled");
  await owner`update auth.users set banned_until = null where id = ${ids.none}`;
  const bootstraps = await Promise.allSettled(
    [1, 2].map(() => bootstrapAdmin(process.env.TEST_OWNER_URL!, ids.platform)),
  );
  expect(
    bootstraps.filter((result) => result.status === "fulfilled"),
  ).toHaveLength(1);
  a = await newComplex(runtime.db, ids.platform, {
    name: "Complex A",
    slug: "complex-a",
  });
  b = await newComplex(runtime.db, ids.platform, {
    name: "Complex B",
    slug: "complex-b",
  });
  adminGrant = await addRole(runtime.db, ids.platform, a.id, {
    userId: ids.adminA,
    role: "complex_admin",
  });
  await addRole(runtime.db, ids.platform, b.id, {
    userId: ids.adminB,
    role: "complex_admin",
  });
  await addRole(runtime.db, ids.platform, a.id, {
    userId: ids.deskA,
    role: "front_desk",
  });
});
afterAll(async () => {
  await runtime.close();
  await owner.end();
});
it("applies migrations exactly once with checksums", async () => {
  await migrate(process.env.TEST_OWNER_URL!);
  const rows = await owner`select * from booking_meta.migrations`;
  expect(rows).toHaveLength(1);
});
it("operator bootstrap refuses repeat and runtime credential", async () => {
  await expect(
    bootstrapAdmin(process.env.TEST_OWNER_URL!, ids.none),
  ).rejects.toThrow("already been used");
  await expect(
    bootstrapAdmin(process.env.TEST_DATABASE_URL!, ids.none),
  ).rejects.toThrow();
});
it("platform manages complexes while all lesser actors are denied without writes", async () => {
  expect((await request("admin/complexes", ids.platform)).status).toBe(200);
  const before = await owner`select count(*)::int n from booking.complexes`;
  const audit = await owner`select count(*)::int n from booking.audit_events`;
  for (const actor of [
    undefined,
    ids.none,
    ids.adminA,
    ids.adminB,
    ids.deskA,
    ids.disabled,
  ]) {
    expect(
      (
        await request("admin/complexes", actor, "POST", {
          name: "Forbidden",
          slug: "forbidden",
        })
      ).status,
    ).toBe(actor ? 403 : 401);
  }
  expect(await owner`select count(*)::int n from booking.complexes`).toEqual(
    before,
  );
  expect(await owner`select count(*)::int n from booking.audit_events`).toEqual(
    audit,
  );
});
it("same issued identity accesses only its complex; desk gets only safe metadata", async () => {
  for (const actor of [ids.adminA, ids.deskA]) {
    const res = await request(`complexes/${a.id}`, actor);
    expect(res.status).toBe(200);
    expect(Object.keys(await res.json()).sort()).toEqual([
      "id",
      "name",
      "slug",
    ]);
    expect((await request(`complexes/${b.id}`, actor)).status).toBe(403);
  }
  expect((await request(`complexes/${a.id}`, ids.adminB)).status).toBe(403);
  expect(
    (
      await request(`admin/complexes/${a.id}/roles`, ids.adminA, "POST", {
        userId: ids.none,
        role: "front_desk",
      })
    ).status,
  ).toBe(403);
});
it("strict input forbids platform escalation and extra complex scope", async () => {
  for (const input of [
    { userId: ids.none, role: "platform_admin" },
    { userId: ids.none, role: "front_desk", complexId: b.id },
  ])
    expect(
      (
        await request(
          `admin/complexes/${a.id}/roles`,
          ids.platform,
          "POST",
          input,
        )
      ).status,
    ).toBe(400);
  expect(
    (
      await request("admin/complexes", ids.platform, "POST", {
        name: "Again",
        slug: "complex-a",
      })
    ).status,
  ).toBe(409);
});
it("grants, audits, and scopes revocation to the URL complex", async () => {
  const granted = await request(
    `admin/complexes/${a.id}/roles`,
    ids.platform,
    "POST",
    { userId: ids.none, role: "front_desk" },
  );
  expect(granted.status).toBe(201);
  const grant = await granted.json();
  expect(
    (
      await request(
        `admin/complexes/${b.id}/roles/${grant.id}`,
        ids.platform,
        "DELETE",
      )
    ).status,
  ).toBe(404);
  expect((await request(`complexes/${a.id}`, ids.none)).status).toBe(200);
  expect(
    (
      await request(
        `admin/complexes/${a.id}/roles/${grant.id}`,
        ids.platform,
        "DELETE",
      )
    ).status,
  ).toBe(200);
  expect((await request(`complexes/${a.id}`, ids.none)).status).toBe(403);
  const events =
    await owner`select action from booking.audit_events where subject_id = ${grant.id}`;
  expect(events.map((e) => e.action).sort()).toEqual([
    "role.granted",
    "role.revoked",
  ]);
});
it("revocation denies next request with identical already-issued bearer", async () => {
  expect((await request(`complexes/${a.id}`, ids.adminA)).status).toBe(200);
  await revokeRole(runtime.db, ids.platform, a.id, adminGrant.id);
  expect((await request(`complexes/${a.id}`, ids.adminA)).status).toBe(403);
});
it("disabled account loses existing grants, including platform role, with identical bearer", async () => {
  await owner.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(18640, 1)`;
    await tx`update booking.profiles set disabled_at = now() where id in (${ids.adminB}, ${ids.platform})`;
  });
  expect((await request(`complexes/${b.id}`, ids.adminB)).status).toBe(403);
  expect((await request("admin/complexes", ids.platform)).status).toBe(403);
  expect((await request("me", ids.platform)).status).toBe(403);
  await owner`update booking.profiles set disabled_at = null where id in (${ids.adminB}, ${ids.platform})`;
  await expect(
    addRole(runtime.db, ids.platform, a.id, {
      userId: ids.disabled,
      role: "front_desk",
    }),
  ).rejects.toThrow();
});
it("orders an in-flight operation before revocation and rejects every later operation", async () => {
  const grant = await addRole(runtime.db, ids.platform, a.id, {
    userId: ids.adminA,
    role: "complex_admin",
  });
  let markEntered!: () => void;
  let releaseOperation!: () => void;
  const entered = new Promise<void>((resolve) => {
    markEntered = resolve;
  });
  const release = new Promise<void>((resolve) => {
    releaseOperation = resolve;
  });
  const inFlight = protectedOperation(
    runtime.db,
    ids.adminA,
    "complex.workspace",
    a.id,
    async () => {
      markEntered();
      await release;
      return "authorized before revocation";
    },
  );
  await entered;
  const [{ acquired }] =
    await owner`select pg_try_advisory_lock(18640, 1) acquired`;
  expect(acquired).toBe(false);
  const revocation = revokeRole(runtime.db, ids.platform, a.id, grant.id);
  releaseOperation();
  expect(await inFlight).toBe("authorized before revocation");
  await revocation;
  await expect(
    getWorkspace(runtime.db, ids.adminA, a.id),
  ).rejects.toMatchObject({ status: 403 });
});
it("an account disabled while a request waits cannot pass with a stale authorization snapshot", async () => {
  let pending: ReturnType<typeof getWorkspace> | undefined;
  await owner.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(18640, 1)`;
    pending = getWorkspace(runtime.db, ids.adminB, b.id);
    // Attach rejection handling immediately while the operation waits for this transaction.
    void pending.catch(() => {});
    await tx`update booking.profiles set disabled_at = now() where id = ${ids.adminB}`;
  });
  await expect(pending!).rejects.toMatchObject({ status: 403 });
  await owner`update booking.profiles set disabled_at = null where id = ${ids.adminB}`;
});
it("duplicate concurrent grants produce one active assignment and one audit", async () => {
  const outcomes = await Promise.allSettled(
    [1, 2].map(() =>
      addRole(runtime.db, ids.platform, b.id, {
        userId: ids.none,
        role: "front_desk",
      }),
    ),
  );
  expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
  const rows =
    await owner`select id from booking.role_assignments where user_id = ${ids.none} and complex_id = ${b.id} and revoked_at is null`;
  expect(rows).toHaveLength(1);
  expect(
    await owner`select id from booking.audit_events where subject_id = ${rows[0].id}`,
  ).toHaveLength(1);
});
it("audit failure rolls back complex insertion", async () => {
  await owner.unsafe(
    `create function booking.fail_audit() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end $$; create trigger fail_audit before insert on booking.audit_events for each row execute function booking.fail_audit();`,
  );
  try {
    await expect(
      newComplex(runtime.db, ids.platform, {
        name: "Rollback",
        slug: "rollback",
      }),
    ).rejects.toThrow();
  } finally {
    await owner.unsafe(
      "drop trigger fail_audit on booking.audit_events; drop function booking.fail_audit()",
    );
  }
  expect(
    await owner`select id from booking.complexes where slug = 'rollback'`,
  ).toHaveLength(0);
});
it("database refuses browser access, runtime audit edits, profile enable and platform escalation", async () => {
  for (const role of ["anon", "authenticated"]) {
    const [{ allowed }] =
      await owner`select has_schema_privilege(${role}, 'booking', 'usage') allowed`;
    expect(allowed).toBe(false);
  }
  const client = postgres(process.env.TEST_DATABASE_URL!);
  try {
    await expect(client`delete from booking.audit_events`).rejects.toThrow();
    await expect(
      client`update booking.audit_events set action = 'tampered'`,
    ).rejects.toThrow();
    await expect(
      client`update booking.profiles set disabled_at = null`,
    ).rejects.toThrow();
    await expect(
      client`insert into booking.role_assignments(user_id,role,granted_by) values (${ids.none},'platform_admin',${ids.platform})`,
    ).rejects.toThrow();
  } finally {
    await client.end();
  }
});
it("archived complex is inaccessible", async () => {
  await owner`update booking.complexes set status = 'archived' where id = ${b.id}`;
  await expect(
    getWorkspace(runtime.db, ids.adminB, b.id),
  ).rejects.toMatchObject({ status: 404 });
});

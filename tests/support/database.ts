import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import postgres from "postgres";
import { migrate } from "../../packages/db/src/migrate";
export async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) =>
    server.close((e) => (e ? reject(e) : resolve())),
  );
  return port;
}
export async function testDatabase() {
  const dir = await mkdtemp(join(tmpdir(), "booking-lt-pg-"));
  const password = randomBytes(24).toString("hex");
  const port = await freePort();
  const pg = new EmbeddedPostgres({
    databaseDir: join(dir, "data"),
    port,
    user: "postgres",
    password,
    persistent: false,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1", "-k", dir],
    onLog: () => {},
    onError: () => {},
  });
  const ownerUrl = `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
  const runtimeUrl = `postgresql://booking_app:${password}@127.0.0.1:${port}/postgres`;
  const owner = postgres(ownerUrl, { onnotice: () => {} });
  try {
    await pg.initialise();
    await pg.start();
    // This fixture replaces only Supabase's managed Auth tables, not its Auth behavior.
    await owner`create schema auth`;
    await owner`create table auth.users(id uuid primary key, email_confirmed_at timestamptz, banned_until timestamptz)`;
    await owner`create role anon nologin`;
    await owner`create role authenticated nologin`;
    await migrate(ownerUrl);
    await migrate(ownerUrl);
    await owner.unsafe(`alter role booking_app login password '${password}'`);
    return {
      owner,
      ownerUrl,
      runtimeUrl,
      async stop() {
        await owner.end();
        await pg.stop();
        await rm(dir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await owner.end();
    await pg.stop().catch(() => {});
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}
export const ids = {
  platform: "10000000-0000-4000-8000-000000000001",
  adminA: "10000000-0000-4000-8000-000000000002",
  adminB: "10000000-0000-4000-8000-000000000003",
  deskA: "10000000-0000-4000-8000-000000000004",
  none: "10000000-0000-4000-8000-000000000005",
  disabled: "10000000-0000-4000-8000-000000000006",
};
export async function seedUsers(owner: ReturnType<typeof postgres>) {
  for (const id of Object.values(ids))
    await owner`insert into auth.users(id, email_confirmed_at) values (${id}, now())`;
  await owner`update booking.profiles set disabled_at = now() where id = ${ids.disabled}`;
}

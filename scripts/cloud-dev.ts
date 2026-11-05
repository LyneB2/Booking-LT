import { spawn } from "node:child_process";
import { testDatabase, seedUsers, ids } from "../tests/support/database";
import { authServer } from "../tests/support/auth-server";
import { bootstrapAdmin } from "../packages/db/src/bootstrap";
import { connect, newComplex, addRole } from "@booking-lt/db";
const db = await testDatabase();
const fixture = await authServer();
const runtime = connect(db.runtimeUrl);
await seedUsers(db.owner);
await bootstrapAdmin(db.ownerUrl, ids.platform);
const a = await newComplex(runtime.db, ids.platform, {
  name: "Playa Serena Residences",
  slug: "playa-serena",
});
const b = await newComplex(runtime.db, ids.platform, {
  name: "Garden Bay",
  slug: "garden-bay",
});
await addRole(runtime.db, ids.platform, a.id, {
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
const production = process.argv.includes("--production");
const child = spawn("npm", ["run", production ? "start" : "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: db.runtimeUrl,
    SUPABASE_URL: fixture.url,
    SUPABASE_PUBLISHABLE_KEY: "protocol-fixture-key",
    APP_ORIGIN: "http://localhost:3000",
    AUTH_FIXTURE_URL: fixture.url,
  },
});
console.log(
  `Cloud sandbox: disposable real PostgreSQL; SIMULATED Supabase Auth and email.\nFictional sign-in: platform@example.test (admin) or ana@example.test.\nFixture mailbox: ${fixture.url}/mailbox (cloud only). Data disappears on exit.`,
);
// Playwright discovers the fixture URL without exposing database credentials.
await import("node:fs/promises").then((fs) =>
  fs.writeFile("/tmp/booking-lt-fixture-url", fixture.url),
);
let cleaning = false;
async function stop() {
  if (cleaning) return;
  cleaning = true;
  child.kill("SIGTERM");
  await runtime.close();
  await fixture.close();
  await db.stop();
}
process.on("SIGTERM", () => {
  void stop();
});
process.on("SIGINT", () => {
  void stop();
});
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
  void stop();
});

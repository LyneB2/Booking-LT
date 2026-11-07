import { spawn } from "node:child_process";
import { testDatabase } from "../tests/support/database";
const database = await testDatabase();
try {
  const child = spawn(
    "npm",
    ["exec", "--", "vitest", "run", "tests/integration"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_DATABASE_URL: database.runtimeUrl,
        TEST_OWNER_URL: database.ownerUrl,
      },
    },
  );
  const code = await new Promise<number>((resolve) =>
    child.on("exit", (code) => resolve(code ?? 1)),
  );
  process.exitCode = code;
} finally {
  await database.stop();
}

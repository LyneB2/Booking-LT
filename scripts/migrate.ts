import "dotenv/config";
import { migrate } from "../packages/db/src/migrate";
if (!process.env.MIGRATION_DATABASE_URL)
  throw new Error("MIGRATION_DATABASE_URL is required (operator credential).");
try {
  await migrate(process.env.MIGRATION_DATABASE_URL);
  console.log("Migrations applied.");
} catch {
  console.error(
    "Migration failed. Verify operator access, Supabase Auth schema and migration history.",
  );
  process.exitCode = 1;
}

import "dotenv/config";
import { uuid } from "@booking-lt/schemas";
import { bootstrapAdmin } from "../packages/db/src/bootstrap";
const url = process.env.MIGRATION_DATABASE_URL;
const id = uuid.safeParse(process.env.BOOTSTRAP_ADMIN_USER_ID);
if (!url || !id.success)
  throw new Error(
    "MIGRATION_DATABASE_URL and a valid BOOTSTRAP_ADMIN_USER_ID are required.",
  );
try {
  await bootstrapAdmin(url, id.data);
  console.log(
    "Initial platform administrator created and audited. Remove bootstrap variables from the runtime.",
  );
} catch (e) {
  const message = (e as Error).message;
  console.error(
    [
      "Platform admin bootstrap has already been used.",
      "A confirmed, enabled Supabase account is required.",
    ].includes(message)
      ? message
      : "Bootstrap failed; verify operator setup.",
  );
  process.exitCode = 1;
}

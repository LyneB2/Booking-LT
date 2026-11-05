import postgres from "postgres";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
export async function migrate(url: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await client.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(18640, 2)`;
      await tx`create schema if not exists booking_meta`;
      await tx`revoke all on schema booking_meta from public`;
      await tx`create table if not exists booking_meta.migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())`;
      const dir = fileURLToPath(new URL("../migrations/", import.meta.url));
      for (const name of (await readdir(dir))
        .filter((f) => /^\d+.*\.sql$/.test(f))
        .sort()) {
        const content = await readFile(`${dir}/${name}`, "utf8");
        const checksum = createHash("sha256").update(content).digest("hex");
        const [old] =
          await tx`select checksum from booking_meta.migrations where name = ${name}`;
        if (old) {
          if (old.checksum !== checksum)
            throw new Error("Applied migration checksum changed.");
          continue;
        }
        await tx.unsafe(content);
        await tx`insert into booking_meta.migrations(name, checksum) values (${name}, ${checksum})`;
      }
    });
  } finally {
    await client.end();
  }
}

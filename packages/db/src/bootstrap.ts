import postgres from "postgres";
export async function bootstrapAdmin(url: string, userId: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await client.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(18640, 1)`;
      // Historical grants deliberately prevent this from becoming a recovery/escalation endpoint.
      const [prior] =
        await tx`select id from booking.role_assignments where role = 'platform_admin' limit 1`;
      if (prior)
        throw new Error("Platform admin bootstrap has already been used.");
      const [user] =
        await tx`select p.id from booking.profiles p join auth.users u on u.id = p.id
        where p.id = ${userId} and p.disabled_at is null and u.email_confirmed_at is not null
        and (u.banned_until is null or u.banned_until < now())`;
      if (!user)
        throw new Error("A confirmed, enabled Supabase account is required.");
      const [grant] =
        await tx`insert into booking.role_assignments(user_id, role, granted_by) values (${userId}, 'platform_admin', ${userId}) returning id`;
      await tx`insert into booking.audit_events(actor_user_id, action, subject_id) values (${userId}, 'platform_admin.bootstrapped', ${grant.id})`;
    });
  } finally {
    await client.end();
  }
}

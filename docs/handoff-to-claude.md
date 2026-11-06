# Handoff back to Claude — 2026-11-06

## Owner's current direction

Claude is the primary builder; Codex independently reviews. The owner prefers
Claude's original complex-page and workspace mockups. Keep that visual direction
when implementing the complex editor and public page.

## Verified repository state at handoff

- `main` is `ab8d7adf2fe955f1f6482404a5d87c9358029dee`: merged documentation from PR #1.
- PR #2, `claude/m1-complex-page-plan`, is open and unmerged at
  `0484c8a72ce1074b6a9e37629b7957b3d342cc20`. It holds the plan and static designs.
- PR #3, `codex/m1-1-foundation`, is based on PR #2 and remains unmerged.
  Its application implementation is unchanged by this documentation-only handoff.
- No application code has reached main. No code revert, reset, force-push or
  branch deletion is needed to change the builder.
- Recheck branches and pull-request status before acting; this is a dated snapshot.

## Existing implementation to assess and reuse

PR #3 adds Next.js/TypeScript, shared Zod schemas and authorization, Drizzle and SQL
migrations, email-code sign-in, server-managed sessions, operator-only initial
platform admin, complex creation and scoped role grants/revocation, audit records,
a Docker-free cloud test setup and GitHub Actions checks. The complex editor,
publishing, photos, bookings, payments, operations and Expo UI are deferred.

GitHub Actions run [42117718256](https://github.com/LyneB2/Booking-LT/actions/runs/42117718256)
completed successfully for implementation commit
`4e85f608b03b8e7c478ccca81efd597b301c0824`. That run covers the implementation
before this handoff, not later changes. See [verification-m1-1.md](verification-m1-1.md)
and [development.md](development.md) for commands, evidence and limitations.

Tests use real PostgreSQL but simulated Supabase Auth/email responses. Hosted
Supabase/Resend, real token refresh and email delivery, pooler/TLS connectivity,
Vercel preview/staging and real-phone checks remain unfinished.

## Next work for Claude

1. Read AGENTS.md, CLAUDE.md, product.md, engineering.md, development.md and both PRs.
2. Assess and reuse the foundation. Correct specific defects with tests; explain
   any substantial replacement before undertaking it. Keep the existing safety
   improvements for atomic publication, private media, disabled accounts and
   stale previews. They are requirements for later slices, not shipped features.
3. Preserve the preferred designs in `design/previews/m1-complex-page.html` and
   the supplied image/screenshots. Static controls and sample data are not working
   application features. The current platform-admin screen is not the future
   complex-admin editor.
4. Continue in a focused branch preserving the existing implementation ancestry.
   Coordinate with the owner before resuming changes on the former Codex branch;
   no simultaneous writers, force-pushes or history resets.
5. M1.1 and its existing stack are approved. Finish review and hosted-service setup
   as access becomes available. Propose M1.2's concrete scope/designs for approval
   before implementing later slices. Ask only for genuinely blocking decisions.
6. Open reviewable PRs for Codex review. Neither agent merges or deploys production
   without the owner's separate instruction. No paid resources are authorized.

Keep PR #2 and the draft PR #3 available until a reviewed successor explicitly
supersedes them. Do not delete either branch, copy production data into tests, or
treat this handoff as proof that hosted authentication or payments work.

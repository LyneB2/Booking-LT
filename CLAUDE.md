# CLAUDE.md

Before any work in this repository, read and follow:

1. [docs/product.md](docs/product.md) — product brief, roles, workflows, phased scope, open decisions.
2. [docs/engineering.md](docs/engineering.md) — architecture, security, testing, workflow and release standards.

Those documents are the source of truth; this file only points to them.

Key reminders:
- Do not treat open decisions in `docs/product.md` as settled; ask, with numbered questions.
- Propose scope and acceptance criteria before implementing a module.
- Report honestly what is implemented, mocked, untested or unfinished.
- Record approved decisions in `docs/`, not only in conversation.
- Work on a focused branch and open a pull request; do not merge it yourself.

Claude is the primary builder as of the owner's 2026-11-06 decision. Codex
independently reviews implementation PRs. Preserve and assess the M1.1 foundation
from PR #3; use the original PR #2 mockups as the preferred visual direction.
Read [docs/handoff-to-claude.md](docs/handoff-to-claude.md) before continuing.
Check security boundaries, database invariants, test evidence and remaining setup;
do not assume chat context. M1.1 and its TypeScript/Next.js/Supabase/Drizzle/Zod/
Vitest/Playwright stack are approved as of 2026-11-05. That approval does not
include paid resources, production deployment, merging, or later modules.

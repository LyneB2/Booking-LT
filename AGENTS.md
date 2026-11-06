# AGENTS.md

Instructions for Codex and other coding agents working in this repository.

Read and follow these shared documents before making or reviewing changes:

1. [docs/product.md](docs/product.md) — product brief, roles, workflows, phased scope, open decisions.
2. [docs/engineering.md](docs/engineering.md) — architecture, security, testing, workflow and release standards.

They are the source of truth; this file does not repeat them.

When reviewing a pull request, check it against both documents, with particular
attention to server-side authorization across roles and complexes, guest-data
exposure, and whether the PR accurately labels what is implemented, mocked,
untested or unfinished.

Claude is the primary builder. Codex independently reviews implementation PRs.
The owner changed this workflow on 2026-11-06. Preserve the existing M1.1 code
and tests for Claude's assessment; switching builders does not authorize a rewrite.
See [docs/handoff-to-claude.md](docs/handoff-to-claude.md).
Do not merge your own pull requests, deploy production, or create paid resources
without separate authorization. Preserve the planning and design work in PR #2.

Verified setup and checks: [docs/development.md](docs/development.md).
The product owner's 2026-11-05 approval covers M1.1 and its stack; later slices
remain deferred. Make routine engineering decisions without re-asking approval.

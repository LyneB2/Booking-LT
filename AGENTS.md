# AGENTS.md

Instructions for Codex and other coding agents working in this repository.

Read and follow these shared documents before making or reviewing changes:

1. [docs/product.md](docs/product.md) — product brief, roles, workflows, phased scope, open decisions.
2. [docs/engineering.md](docs/engineering.md) — architecture, security, testing, workflow and release standards.
3. [docs/design.md](docs/design.md) — visual and interaction design rules (typography, layout, spacing, radii, gallery).

They are the source of truth; this file does not repeat them.

When reviewing a pull request, check it against both documents, with particular
attention to server-side authorization across roles and complexes, guest-data
exposure, and whether the PR accurately labels what is implemented, mocked,
untested or unfinished.

Setup and test commands: none exist yet. They will be listed in
`docs/engineering.md` once verified.

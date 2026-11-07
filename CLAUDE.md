# CLAUDE.md

Before any work in this repository, read and follow:

1. [docs/product.md](docs/product.md) — product brief, roles, workflows, phased scope, open decisions.
2. [docs/engineering.md](docs/engineering.md) — architecture, security, testing, workflow and release standards.
3. [docs/design.md](docs/design.md) — visual and interaction design rules, including demo content and imagery.
4. [docs/development.md](docs/development.md) — environments, demo dataset, seeding and resetting.

Those documents are the source of truth; this file only points to them.

Key reminders:
- Do not treat open decisions in `docs/product.md` as settled; ask, with numbered questions.
- Propose scope and acceptance criteria before implementing a module.
- Use the demo dataset (`demo/`) for fictional content in development, staging and previews; never in production.
- Report honestly what is implemented, mocked, untested or unfinished.
- Record approved decisions in `docs/`, not only in conversation.
- Work on a focused branch and open a pull request; do not merge it yourself.

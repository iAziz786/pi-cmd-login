# AGENTS.md

## Commits

- Use Conventional Commits: `type(scope): subject`
- Scope is **required**; always name the affected area, e.g. `feat(pricing): ...`, `fix(models): ...`
- Types: `feat`, `fix`, `chore`, `docs`, `ci`, `test`, `refactor`, `perf`, `style`
- One logical change per commit; don't bulk unrelated changes
- Don't commit until validation complete (tests pass: `bun test`)
- Example: `feat(extension): add Command Code model provider`
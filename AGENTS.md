# AGENTS.md

## Commits

- Use Conventional Commits: `type(scope): subject`
- One logical change per commit; don't bulk unrelated changes
- Don't commit until validation complete (tests pass: `bun test`)
- Types: `feat`, `fix`, `chore`, `docs`, `ci`, `test`, `refactor`, `perf`, `style`
- Scope is optional, use it for the area affected, e.g. `feat(pricing): ...`, `fix(models): ...`
- Example: `feat(extension): add Command Code model provider`
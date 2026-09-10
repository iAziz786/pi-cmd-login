# AGENTS.md

## Commits

- Use Conventional Commits: `type(scope): subject`
- Scope is **required**; always name the affected area, e.g. `feat(pricing): ...`, `fix(models): ...`
- Types: `feat`, `fix`, `chore`, `docs`, `ci`, `test`, `refactor`, `perf`, `style`
- One logical change per commit; don't bulk unrelated changes
- Don't commit until validation complete (tests pass: `bun test`)
- Example: `feat(extension): add Command Code model provider`

## Model roster sync

The `index.ts` roster must match the live Command Code catalog. Run this whenever the user reports new models or asks to check the catalog; the catalog changes without notice.

1. Fetch the catalog: `curl -s https://api.commandcode.ai/provider/v1/models`
2. Diff its `data[].id` values against the `id:` values in `index.ts`. Completion: no missing, no extra.
3. Add missing models and remove the blocks of models no longer listed. The API carries no rates — take `cost` from https://commandcode.ai/models (master table: input/output/cache-read $/M, deal annotations) or the per-model page `commandcode.ai/models/<slug>`.
4. DeepSeek models with a "peak hours" section bill by time of day: put their peak/off-peak rates in `DEEPSEEK_PRICING` in `pricing.ts` — the `message_end` cost recompute keys off that table, not the flat `cost`. Models without peak hours are flat-rate and stay out.
5. Regenerate the model table in `README.md` from the fetched catalog.
6. Update `catalog.yaml` — the deterministic source of truth for pricing (each entry has `cost`, `contextWindow`, and `source` link). Either run `bun run sync:catalog` to refetch live pricing, or edit `catalog.yaml` by hand; `catalog.test.ts` fails if `index.ts`/`pricing.ts` drift from it, so wrong pricing cannot ship.
7. Re-run the diff (zero missing, zero extra) and `bun test` before committing.

## Release

- Land changes through a PR; branch protection requires it. Squash-merge and delete the branch.
- Bump `package.json` `version` to the release version first, via a `chore(release)` PR (e.g. `chore(release): bump to 0.4.11`). The `publish` workflow fails the release if the tag does not equal `v<package.json version>` — never tag a version below the current one.
- Create the tag with a message: `git tag -s vX.Y.Z -m "..."`. A bare `git tag` opens an editor (gpg signing is on) and hangs.
- Push the tag (`publish` runs `bun test` + `npm publish`), then `gh release create` with notes from the PR body.

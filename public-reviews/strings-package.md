# The string catalogue becomes a workspace package

Reviewed November 16, 2026. This is engineering evidence for the dependency delta, not publication clearance.

## Delta

The private workspace package `@studio/i18n` (`packages/i18n`) is added. It holds the files that were `apps/studio/src/renderer/src/i18n`, moved unchanged. Its `package.json` declares three development dependencies, all already resolved by other workspaces at the same ranges: `@studio/events` (workspace), `@types/bun` and `typescript`.

`apps/studio/package.json` gains one development dependency, `@studio/i18n` at `workspace:*`. Vite bundles it from source, as it does the other workspace packages.

`bun.lock` gains twelve lines and loses none: the `@studio/i18n` line under the Studio workspace, the `packages/i18n` workspace entry, and its link entry. No third-party package is added or removed and no version moves.

## License and notice evidence

No third-party code enters or leaves a build, so `NOTICE`, `compliance/dependencies.json` and `compliance/assets.json` are unchanged.

## Advisories

`bun audit --json` was run again for the new lockfile hash, as `compliance/README.md` describes. It returned the same 68 advisory entries, eight affecting a shipped package version, with exit 1. `compliance/advisories.json` changes only in its scan times, revision and lockfile hash. `compliance/assets.json` is unchanged; the regeneration's generic rewrite of the two canvas image entries was discarded.

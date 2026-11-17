# Removal of the download worker workspace

Reviewed November 16, 2026. This is engineering evidence for the dependency delta, not publication clearance.

## Delta

The root `package.json` drops `workers/*` from `workspaces`, together with the `workers/latest` package (`@studio/worker-latest`) it held. That package had two development pins, `@cloudflare/workers-types` 5.20260804.1 and `typescript` ^7.0.2, and no runtime dependencies. The root `package.json` also loses the `ship`, `stage`, `publish` and `build:dmg:beta` scripts; no dependency field changes besides `workspaces`.

`bun.lock` loses the `workers/latest` workspace entry, its workspace link and `@cloudflare/workers-types` 5.20260804.1, which nothing else depended on. `typescript` stays, resolved for the other workspaces. No package is added and no remaining package changes version.

## License and notice evidence

The worker was never part of a Studio build, so `NOTICE`, `compliance/dependencies.json` and `compliance/assets.json` are unchanged.

## Advisories

`bun audit --json` was run again for the new lockfile hash, as `compliance/README.md` describes. It returned the same 68 advisory entries, eight affecting a shipped package version, with exit 1. None names the removed package. `compliance/advisories.json` changes only in its scan times, revision and lockfile hash. The regeneration's generic rewrite of the two canvas image entries in `compliance/assets.json` was discarded.

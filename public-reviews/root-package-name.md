# The root workspace package is named `onlook`

Reviewed November 16, 2026. This is engineering evidence for the lockfile delta, not publication clearance or release authorization.

## Delta

The root `package.json` changes only its `name`, to `onlook`. Its dependency maps are unchanged.

`bun.lock` changes only the root workspace's `name` line. Bun 1.4.4 keeps the root name it already recorded when `package.json` renames it, and writes the new one only into a lockfile it creates, so that one line was set to the name a new lockfile carries. `bun install --frozen-lockfile` accepts the result with no package changes. No package is added, removed or moved to another version.

## License and notice evidence

No third-party code enters or leaves a build, so `NOTICE`, `compliance/dependencies.json` and `compliance/assets.json` are unchanged.

## Advisories

`bun audit --json` was run again for the new lockfile hash, as `compliance/README.md` describes. It returned the same 68 advisory entries, eight affecting a shipped package version, with exit 1. `compliance/advisories.json` changes in its scan times, revision and lockfile hash, and in the six dependency paths that start at the root package, which now name `onlook@0.0.0`. The regeneration's generic rewrite of the two canvas image entries in `compliance/assets.json` was discarded.

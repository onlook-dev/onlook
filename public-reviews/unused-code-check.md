# knip joins the development tools

Reviewed November 16, 2026. This is engineering evidence for the dependency delta, not publication clearance.

## Delta

The root `package.json` gains one exact development pin, `knip` 6.45.1, published November 11, 2026. It runs as `bun run check:unused` in `verify` and CI and reads source files; no build imports it.

`bun.lock` gains knip and what it needs that the tree did not already hold: `fd-package-json` 2.0.0, `formatly` 0.11.4, `get-tsconfig` 4.14.3, `oxc-parser` 0.156.0 with `@oxc-project/types` 0.156.0 and its platform bindings, `package-manager-detector` 1.9.0, `picomatch` 4.0.7, `resolve-pkg-maps` 1.0.0, `smol-toml` 1.9.1, `strip-json-comments` 5.0.3, `unbash` 6.0.4, `walk-up-path` 4.0.0 and `yaml` 2.9.1. Every package that was installed before is still installed at the same version and still resolves its own dependencies to the same versions: `oxc-parser` 0.143.0 and `picomatch` 4.0.5 stay for the packages that used them, now as nested entries. No package is removed.

## License and notice evidence

No third-party code enters or leaves a build, so `NOTICE`, `compliance/dependencies.json` and `compliance/assets.json` are unchanged.

## Advisories

`bun audit --json` was run again for the new lockfile hash, as `compliance/README.md` describes. It returned the same 68 advisory entries, eight affecting a shipped package version, with exit 1. None names an added package. `compliance/advisories.json` changes only in its scan times, revision and lockfile hash. The regeneration's generic rewrite of the two canvas image entries in `compliance/assets.json` was discarded.

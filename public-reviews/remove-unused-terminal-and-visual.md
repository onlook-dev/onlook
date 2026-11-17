# Removal of the unused terminal dependencies and visual package

Reviewed November 13, 2026. This is engineering evidence for the dependency delta, not publication clearance.

## Delta

Two exact development pins leave `apps/studio/package.json`: `@xterm/xterm` 6.0.0 and `@xterm/addon-fit` 0.11.0. The embedded terminal that used them is deleted in the same branch, along with the stylesheet import that brought xterm's CSS into the renderer build. The lockfile loses those two packages and nothing else in that revision.

The private workspace package `@studio/visual` (`packages/visual`) is deleted and leaves the root `devDependencies`. No code in the repository imported it. Its `package.json` is recorded with the SHA-256 of empty input. The lockfile loses its workspace entry and its link entry; it declared only `@types/node` and `typescript`, which other workspaces still resolve. No package is added and no version moves.

## License and notice evidence

The inventory was regenerated with the commands in `compliance/README.md`. `compliance/dependencies.json` and `NOTICE` lose the `@xterm/xterm` 6.0.0 entry (MIT) and change nowhere else. `@xterm/addon-fit` had no entry, since no build resolved it. The notice is no longer needed because no build output contains xterm code or styles.

`packages/visual` was a vendored fork with an open licence-provenance item in `compliance/README.md`. The package is removed in full, so nothing from it is distributed and that item is removed with it. It was never part of a build or of `NOTICE`.

`compliance/assets.json` is unchanged; the regeneration's generic rewrite of the two canvas image entries was discarded.

## Advisories

The fresh full-lockfile `bun audit --json` returned 63 advisory entries, three affecting a shipped package version, with exit 1. The two entries beyond the November 11 scan are `GHSA-qv5m-9pm6-hqp3` and `GHSA-jpvv-r467-5p4w` against `@hono/node-server` 2.1.5, reached through the root development dependency `@workos/emulate` 0.14.0. They were published after the previous scan and are unrelated to this removal; no pin was changed for them here. None names a removed package. The advisory narrative in `compliance/README.md` was not rewritten and predates these two entries.

# Removal of the in-tree hosted provider's dependencies

Reviewed November 14, 2026. This is engineering evidence for the dependency delta, not publication clearance.

## Delta

Two exact development pins leave `apps/studio/package.json`: the hosted service's backend client (1.46.0) and its sign-in SDK (10.9.0). Two leave the root `package.json`: the same backend client and the sign-in emulator (0.14.0). This revision's diff of the two manifests names them; this record does not, because the editor names no vendor of the hosted service. The in-tree hosted provider that imported the first two, and the loopback fixture that ran the third, are deleted in the same branch. No other file in the repository imported any of them.

The lockfile loses 33 packages: those three, and the ones only they pulled in, which are `esbuild` 0.27.0 with its 26 platform packages, `prettier` 3.9.10, `ws` 8.21.0 and `chalk` 5.6.2. No package is added and no remaining package changes version; `esbuild` 0.25.12, `prettier` 2.8.8, `ws` 8.22.0 and `chalk` 4.1.2 were already resolved for other dependents and are now the hoisted copies. The `hono` override stays, because `@modelcontextprotocol/sdk` still resolves it.

`bunfig.toml` loses the cooldown exclusion for the sign-in SDK, which existed only for that pin.

## License and notice evidence

The inventory was regenerated with the commands in `compliance/README.md`. Its cloud collection now builds the cloud edition of Studio around the provider fake, because the environment no longer selects a provider. `compliance/dependencies.json` and `NOTICE` lose nine entries and change nowhere else: the backend client, the sign-in SDK, `esbuild` 0.27.0 with its four inventoried host binaries, `prettier` 3.9.10 and `ws` 8.21.0. Every entry the cloud edition of Studio itself adds, the session recorder among them, is still present.

A hosted provider built outside this repository bundles its own dependencies. Those builds run in collection mode and are not covered by this inventory.

`compliance/assets.json` is unchanged; the regeneration's generic rewrite of the two canvas image entries was discarded.

## Advisories

The fresh full-lockfile `bun audit --json` returned 68 advisory entries, eight affecting a shipped package version, with exit 1. The five entries beyond the November 12 scan are `GHSA-4m76-xfj5-7975`, `GHSA-h7mg-cq63-vhpq`, `GHSA-3gg2-335m-rxc6`, `GHSA-46wx-v44x-9hh2` and `GHSA-4h7h-rv7c-7m2v` against `hono` 4.13.13, reached through `@modelcontextprotocol/sdk` 1.32.1. The first version outside all five ranges is 4.13.16. They were published after the previous scan and are unrelated to this removal; the root override that pins 4.13.13 was not changed here. None names a removed package. The advisory narrative in `compliance/README.md` was not rewritten and predates these entries.

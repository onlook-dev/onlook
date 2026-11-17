# Third-party inventory

This folder holds the inventories behind the third-party notices.

## Files

- `dependencies.json` is the dependency inventory. Each entry holds a package's version, source URL, declared license, review flag, preserved license texts and an evidence hash. `scripts/third-party.ts` writes it.
- `advisories.json` holds a `bun audit --json` response and, for each advisory, the installed versions it affects, their dependency paths and the first published version outside the reported range. `scripts/publication-audit.ts` writes it.
- `assets.json` lists every tracked image, sound and font file, and every font file in the two bundled Fontsource packages, with a SHA-256 hash and a source. `scripts/publication-audit.ts` writes it and rewrites every entry, so hand edits must be re-applied after a run.

## How the build uses the inventory

`apps/studio/build/third-party.mjs` lists the packages in each production build and compares them with `dependencies.json`. The build fails when a package version is missing from the inventory, when its license or license evidence differs, or when `NOTICE` is stale.

## NOTICE

The root `NOTICE` holds the third-party notices that ship in the app. `scripts/third-party.ts` renders it from `dependencies.json` in the same run that writes the inventory. The build requires the root `NOTICE` to match the inventory exactly and copies it into the build output. Packaging checks that the packaged copy matches the inventory too.

## Regenerate after a dependency change

Run these commands at the repository root. No `package.json` script wraps them. They need network access.

```sh
mkdir -p .scratch/cloud-notices
printf '%s\n' \
  "import { createStudioConfig } from '$PWD/apps/studio/electron.vite.config.ts';" \
  "export default createStudioConfig({ providerEntry: '$PWD/apps/studio/src/main/cloud/provider-fake.ts', edition: 'cloud' });" \
  > .scratch/cloud-notices/config.mts
(cd apps/studio && STUDIO_COLLECT_NOTICES=1 bun x electron-vite build --config ../../.scratch/cloud-notices/config.mts)
cp apps/studio/out/main/third-party.json .scratch/cloud-notices/main.json
cp apps/studio/out/preload/third-party.json .scratch/cloud-notices/preload.json
cp apps/studio/out/renderer/third-party.json .scratch/cloud-notices/renderer.json
STUDIO_COLLECT_NOTICES=1 bun run --cwd apps/studio build
bun scripts/third-party.ts .scratch/cloud-notices/main.json \
  .scratch/cloud-notices/preload.json .scratch/cloud-notices/renderer.json
bun audit --json > .scratch/advisories-current.json
# bun audit returns nonzero when it finds advisories. Preserve that status.
bun scripts/publication-audit.ts .scratch/advisories-current.json
bun run verify
```

The first build is the cloud edition around the provider fake. The second is the source edition. `STUDIO_COLLECT_NOTICES=1` makes a build write its package list to `third-party.json` without comparing it with the inventory. `scripts/third-party.ts` merges both package lists and writes `dependencies.json` and `NOTICE`. `scripts/publication-audit.ts` reads the new inventory and the audit output, then writes `advisories.json` and `assets.json`.

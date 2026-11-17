## What changed

<!-- One or two sentences on the problem and the change. Link a related issue if there is one. -->

## How you checked it

- [ ] `bun run verify`
- [ ] `bun run test:e2e`, if this changes a flow in the app
- [ ] `bun run test:e2e:packaged` against an app from `bun run build:dmg`, if this touches the main process, a native module or `dependencies`

## Checklist

- [ ] A new changeset (`bun run changeset`, or `bun run changeset --empty`)
- [ ] Every new or changed English string is written in every language under `packages/i18n/src/locales/`
- [ ] Nothing new in `apps/studio` `dependencies`, unless it can't be bundled; if so, `asarUnpack` in `electron-builder.yml` is checked
- [ ] No secrets or credentials in code, logs or committed env files

## Notes for the reviewer

<!-- Anything you decided that someone might reasonably have decided differently. -->

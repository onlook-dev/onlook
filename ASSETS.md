# Assets and third-party rights

The repository's open-source license ([LICENSE.md](LICENSE.md)) covers Onlook's
source code. It does not cover every file in this repository. Some assets are
licensed to Onlook by third parties, and some are Onlook brand assets we don't
license for reuse. This page lists them and tells you what to do if you fork.

**This is not a license change.** It explains how the existing license applies.
Third-party software notices are in [NOTICE](NOTICE).

## Rights table

| Asset | Where it lives | Rights holder | Covered by the open-source license? | If you fork |
|---|---|---|---|---|
| Central Icons | `@central-icons-react/round-outlined-radius-1-stroke-1.5` and the glyphs in `apps/studio/src/renderer/src/icons/` | Iconists (David & Storm GbR) | No | Get your own [Iconists license](https://iconists.co/license) or swap in an openly licensed set |
| Onlook name, logo, and wordmark | `apps/studio/src/renderer/src/icons/OnlookMark.tsx`, `OnlookWordmark.tsx`, `assets/` | Onlook | No | Remove them and use your own name and brand |
| DMG background art | macOS release packaging | Onlook | No | Replace with your own art |
| Sounds | App sound effects | Onlook | No | Replace with your own sounds |

## Licensed icon system: not ours to pass on

Onlook's interface uses [Central Icons](https://iconists.co/central) by
Iconists. Onlook holds a Team license for one Central style
(`round-outlined-radius-1-stroke-1.5`). Iconists' license allows those icons to
appear in Onlook's public source code and builds as part of the product.

That license covers Onlook's team only. It does not extend to you:

- The icons are not covered by the repository's open-source license.
- You may not reuse them in a fork or another project without your own license
  from Iconists.
- You may not redistribute them on their own, as an icon library, pack, or
  download.

You can find licensing information for Central Icons at
[iconists.co/license](https://iconists.co/license). We're grateful to Iconists
for their work, and we strongly encourage you to buy a license to support them.

## If you are forking

- [ ] Replace the Central icons with your own licensed copy or an openly
      licensed icon set (for example, Lucide or Phosphor).
- [ ] Remove the Onlook name, logo, and wordmark, and use your own branding.
- [ ] Replace the DMG background art and sounds.
- [ ] Keep the notices in [NOTICE](NOTICE) for any third-party code you ship.

Questions about these assets: [contact@onlook.com](mailto:contact@onlook.com).

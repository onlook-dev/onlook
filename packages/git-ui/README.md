# @studio/git-ui

Astryx components for git status: the pill at chrome and card size, the card's status row, and the pill's dropdown and tooltip. Each renders from `GitPillState` or `GitCardStateId`, plus strings and callbacks.

## Rules

- **Props are the state types in `state.ts` and plain callbacks.** Never a measurement, a store handle, `window.studio` or anything from `apps/studio/src/main`; `bun run check:imports` enforces this. The one exception is `derive.ts`, which turns `GitMeasurement`, `GitSnapshotRow` and `GitPillDefaults` from `@studio/events` into those states. Main never imports this package.
- **Strings are a prop bag** (`GitStatusStrings`). The app fills it through `t()`; the showroom uses a stub.
- **Colours are `var(--studio-git-*)`**, declared in the app's `styles.css` and mapped once in `palette.ts`, because Astryx's theme tokens are a closed set. No hex values in components.
- **Glyphs are props.** The package can't see the app's icons, so the branch, chevron, check and attention glyphs arrive as `ReactNode`.
- **Tests render statically** with `react-dom/server`. `bun run showroom git` shows the components with interaction.

Astryx components can't be swizzled here: swizzling emits StyleX source this repo doesn't compile, and the result renders unstyled without an error.

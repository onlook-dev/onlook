# Patches

Bun applies these on install; `patchedDependencies` in the root `package.json` lists them.

- `@astryxdesign/core@0.1.9`: a tooltip opens with no delay when `globalThis.__astryxTooltipIsWarm()` answers true. `apps/studio/src/renderer/src/tooltipWarmth.ts` sets that hook, so moving from one tooltip to its neighbour does not wait again.
- `@xyflow/react@12.11.2`: the node resize observer collects its updates and applies them once in the next animation frame, and cancels a pending frame on unmount. Canvas node measurements then settle outside the observer's own delivery.
- `electron-vite@5.0.0`: `clearLine` returns early when stdout is not a terminal, where `process.stdout.moveCursor` does not exist.

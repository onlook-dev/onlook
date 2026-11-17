# @studio/onboarding-ui

Astryx components for onboarding: the agent tiles with their marks, the setup dialog in every Claude and ChatGPT state, and the sign-in card in its dialog and chat versions. Each renders from the state types in `state.ts`, plus strings, glyphs and callbacks.

## Rules

- **Props are the state types in `state.ts` and plain callbacks.** Never a probe result, a store handle, `window.studio` or anything from `apps/studio/src/main`; `bun run check:imports` enforces this.
- **Strings are a prop bag** (`OnboardingUiStrings`). The app fills it through `t()` (`renderer/src/onboarding/uiStrings.ts`); the package's tests use the stub in `fixtures.ts`.
- **Glyphs and marks are props.** The package can't see the app's icons, so the agent marks, avatar glyphs and spinner arrive as `ReactNode`. Tile marks use the theme's colour icon tokens.
- **The agent key is `HarnessId`** (`'claude' | 'codex'`). Users read "ChatGPT"; the key stays `codex`.
- **Tests render statically** with `react-dom/server`, with the dialog inline. `bun run showroom onboarding-ui` shows the modal.

Astryx components can't be swizzled here: swizzling emits StyleX source this repo doesn't compile, and the result renders unstyled without an error.

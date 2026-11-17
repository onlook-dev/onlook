# @studio/chat-ui

Astryx components for the chat: `@studio/events` types in, JSX out.

## Rules

- **Props are `@studio/events` types only**: `StudioEvent`s, the projections derived from them (`TranscriptItem`, `ToolCallView`, `SessionState`) and plain callbacks. Never an Agent SDK message object, an Electron `IpcRenderer` or a store handle.
- **No side effects.** No IPC, no `window.studio`, no fetch, no timers that outlive a render. A component that needs data takes a prop; the wiring lives in `apps/studio/src/renderer`.
- **Strings are a prop bag** (`ChatStrings` in `strings.ts`). The app fills it through `t()`, so no rendered string is written in a component.
- **Astryx and StyleX only.** No Tailwind, no separate CSS files, no inline styles that repeat a token.
- **Every component renders on its own**, without the rest of the app.

Astryx components can't be swizzled here: swizzling emits StyleX source this repo doesn't compile, and the result renders unstyled without an error.

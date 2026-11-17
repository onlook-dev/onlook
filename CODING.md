# CODING.md

## Stack

Electron. A TypeScript monorepo on Turborepo; Bun installs and runs scripts, and the app runs on Electron's Node. React 19 and React Flow; Astryx and StyleX, no Tailwind. Typed IPC in `packages/events`. The Claude Agent SDK and Codex's app-server behind one `AgentBackend`. PostHog for analytics. Electron, the Agent SDK, Astryx and StyleX are pinned to exact versions, and a bump is a deliberate, tested change. Replacing any part of the stack is discussed in an issue before a PR.

## Guardrails

Breaking one of these usually fails silently.

- `apps/studio` runtime `dependencies` hold only unbundleable externals; everything else, workspace packages included, is a `devDependency` Vite bundles. Adding one means checking `asarUnpack`.
- SDK imports stay inside `main/agent-host` (`check:imports`).
- Renderer code imports along its layers, and the list of imports that do not only shrinks (`check:imports`; Structure, Renderer layers).
- A file that writes a class from a component sheet imports that sheet, and the list of files that do not only shrinks (`check:imports`; Structure, Component sheets).
- Every rendered string is `t()` from the catalog, one JSON file per key prefix under `packages/i18n/src/locales/en/`; a key is removed with the last thing that renders it. `check:strings` finds only orphaned and misfiled keys; whether a rendered string went through the catalog at all is for review to catch.
- Account and team text lives only in `account.json` and `teams.json`, which `packages/i18n/src/edition/cloud.ts` loads and a source build swaps for `edition/source.ts`, so a source build carries none of it (ONL-2665).
- Catalog text is laid out for every language, not only for English. A box that holds it grows or wraps to its content; a width, a line count or a caption sized to the English clips the longer translation. A one-line row that has to shorten shortens the name or value inside it, never the sentence's end, which is where Japanese puts the verb. Japanese breaks between phrases through `:root:lang(ja) { word-break: auto-phrase }` in `styles.css`; Astryx's `Text` and `Heading` with `maxLines`, and its tooltips, set their own `word-break` over it, so their Japanese breaks mid-word unless their style sets `auto-phrase` again (ONL-3139).
- Telemetry never sees a codebase: no paths, contents, prompts, repo or branch names. `workspaceTelemetryId()` hashes the Workspace's repo identity, never a cwd, and is sent as `project_id`.
- The same applies to logs and errors. A log line carries scalars, never a protocol, turn, tool or prompt object. Every captured error names its owner, and only `ours` is reported as an issue. `console.*` in `apps/studio/src` fails `check:imports`, except in tests: log through `main/log/`, and write to stdout only through `probeOutput()`.
- `ANTHROPIC_BASE_URL` without `ANTHROPIC_AUTH_TOKEN` sends the user's own subscription OAuth token to that host. Anything that points the agent at a proxy sets both or neither.
- The Onlook Agent never runs in the user's checkout: a session's cwd is the Project's worktree, which Onlook created `--no-track` or the user explicitly imported as a linked worktree; `main/agent-host` refuses unregistered directories, with no way to override it. An import refuses a checkout, a path nested inside a worktree, a non-git directory, and a worktree whose repository is gone.
- The Onlook Agent changes a Project's files through its shell as often as through its Read, Write and Edit tools. So nothing Onlook shows, records or triggers from the agent's work keys off file-edit tool events alone, whether that is a hook, a Frame's state, a status line or a telemetry fact; it reads what actually changed (ONL-2974).
- A function that takes a `CanvasDoc` and iterates `doc.nodes` declares its page scope in its name or its signature.
- An Artifact outlives every Project: its record lives under `stateRoot()/artifacts/`, never `workspaceRoot()`, `teardownProject()` doesn't touch it, and nothing cleans it up. Only a designer deleting it removes one. The index beside that directory says what exists, and every field in it is also in a manifest, so the index can be rebuilt.
- A guest page gets Onlook's preload and the Frames session only when `main/frames/` recognises it as a dev Frame (`http:`, `https:`, `about:blank`); anything else loads in `persist:studio-artifacts` with no bridge. `main/artifacts/session.ts` is the only module that registers `webRequest` on that session, because only one listener per event per session takes effect, and the Artifact CSP is a constant, never built from a request. Setting `bypassCSP` on the scheme would undo all of it.
- Tooling for coding agents is a library, not a package script: a running app is reached through the diagnostics gate, the typed bridges and `@studio/fixtures`. Fixtures create state by calling the product's own code, never a copy of it.
- A one-off script a coding agent writes mid-task lives in its worktree's `.scratch/`, or the owning workspace package's when it imports a renderer module or React (ONL-2376). That directory is ignored by Git, so the script never needs cleaning up. `check:scratch` refuses a tracked file named like a throwaway, and a script under `tests/e2e/` or `tests/live/` that has no runner suffix and isn't one of their libraries. Move such a script to `.scratch/`; don't rename it into a suffix a runner collects.
- The diagnostics gate, which exposes app state and the renderer's actions, opens only on an unpackaged build. `main/diagnostics/gate.ts` decides this and nothing else does; a packaged build adds no debugging switch, registers no handler and carries no gate flag. It is not a security boundary: Chromium's own `--remote-debugging-port` still opens a signed build's whole preload bridge, and no Electron fuse closes it.
- Every check runs locally as well as in CI.

## Structure

- Every component renders on its own, from props. If an import stops a component rendering outside the app, fix the import.
- Screens render from data that is already loaded: no reads on mount, no navigation that waits on a fetch.
- If you need to mount a component to check how its state behaves, the state has moved into the component; move it back out.
- A file is as large as its one responsibility needs.
- Code that is kept but not called carries `@parked ONL-xxxx`. Without a ticket it is dead code and is removed.
- Don't ship a control that does nothing.

### Renderer layers

Every folder and root file under `apps/studio/src/renderer/src`, the lab beside it, the three UI packages and the strings package sit in one of four layers. A file imports from its own layer and the layers before it. A feature never imports another feature; what two features share belongs in kit or shell. Tests are exempt.

| Layer | What belongs there | Members |
|---|---|---|
| kit | Parts that know no project and no screen | `agents`, `assets`, `fan`, `flags`, `icons`, `menu`, `overlay`, `panel`, `perf`, `reorder`, `replay`, `shortcuts`, `theme`; root files `AstryxLanguage.tsx`, `FailureDialogBody.tsx`, `RegionErrorBoundary.tsx`, `RenameField.tsx`, `attachments.ts`, `bridge.ts`, `capabilities.ts`, `env.d.ts`, `errors.ts`, `inputModality.ts`, `log.ts`, `mirror.ts`, `nodeLabel.ts`, `reducedMotion.ts`, `refusal.ts`, `restingMock.ts`, `setupStepNames.ts`, `tabIdentity.ts`, `tooltipWarmth.ts`, `useLatestRef.ts`; the file `settings/derive.ts`; `packages/chat-ui`, `packages/git-ui`, `packages/i18n`, `packages/onboarding-ui` |
| shell | The window around the features: the stores every region reads, panels, rails, bars | `activation`, `agent`, `app`, `chrome`, `diagnostics`, `git-status`, `notifications`, `panels`, `rail`, `topbar`, `workspace`; root files `ParkedScreen.tsx`, `heldProject.ts`, `layout.ts`; the files `settings/store.ts`, `sidebar/footStore.ts`, `tips/early.ts`, `tips/lifetime.ts`, `tips/moment.ts`, `tips/onScreen.ts` |
| features | One thing a user does | `agent-setup`, `agentStatus`, `canvas`, `chat`, `cloud`, `code`, `create`, `github-import`, `login`, `onboarding`, `project-setup`, `projects`, `report`, `server`, `settings`, `sidebar`, `task-manager`, `telemetry`, `tips`, `tour` |
| entries | Where a view or a developer instrument starts, and the one place features are composed | `main.tsx`, `boot.ts`, `Root.tsx`, `App.tsx`, `chrome/entry.tsx`, `task-manager/entry.tsx`, `dev`, `testing`, `renderer/lab` |

`check:imports` holds this table as `RENDERER_LAYERS` and `OUTSIDE_LAYERS` in `scripts/check-imports.ts`. A new folder or root file fails the check until it has a row, so its layer is chosen when it is added.

The imports that break the layers today are listed in `scripts/check-imports.layers.txt`, one `from → to` per line. The list only shrinks: an import that is not on it fails, and so does a line whose import is gone. `bun run check:imports --prune-baseline` drops the lines that are gone and never adds one. `bun run check:imports --layers` counts what is left by layer pair and by folder pair.

### Component sheets

A sheet beside a component holds that component's rules; `renderer/src/styles.css` and `renderer/src/theme/studio.css` are loaded by every page and hold the rest. A file that hands a class from a component sheet to `className` or `classList` imports that sheet itself, so it is styled without another module loading the sheet first. A class two sheets name is at home in either. Tests are exempt, and a class named only in a query, a test id or a comment doesn't count.

`check:imports` lists the files that break this today in `scripts/check-imports.styles.txt`, one `file → sheet` per line, under the layer list's rules: the list only shrinks, and `--prune-baseline` drops the lines that are gone. Adding an import can move a sheet earlier in the built CSS; compare the built sheets before and after.

### Main leaves

`main/state`, `main/log`, `main/flags` and `main/telemetry` are main's leaves, lowest first. A leaf's files import, from the app's source, only the base files, their own folder and the leaves before it. Anything a leaf needs from above it comes in as an argument from `main/index.ts`. Tests are exempt.

`check:imports` holds the order as `MAIN_LEAVES` and the base files as `MAIN_BASE` in `scripts/check-imports.ts`. The imports that break it today are listed in `scripts/check-imports.leaves.txt` and follow the layer list's rules: the list only shrinks, and `--prune-baseline` drops the lines that are gone.

## Performance

Most changes need no thought about speed. A few kinds of change cost nothing you'd notice once, and add up when they repeat or grow with the project:

- work that runs on every turn, keystroke, pointer move, zoom step or frame;
- a timer, poll or watcher, which keeps costing while the user does nothing;
- a loop over every node, frame or file, quick on a fixture and slow on a real project;
- anything added to startup or to opening a project.

When a change is one of these, try it on a large project and notice whether anything feels slower, and say in the PR what you saw (ONL-2974).

## Analytics

A feature that changes what a user can do, or how far they get, ships with analytics events, within the telemetry rule above. The events are defined in `apps/studio/src/main/telemetry/events.ts`.

An event records what happened, and its properties are what was observed: counts, enums, hashes. Conclusions are drawn in PostHog, where a definition can change without a new build and still applies to every event already sent. When a value can't be sent, the app sends a fact derived from it, not a conclusion. A fact only covers what it could see, and no later query recovers what it missed: `files_changed` counts the targets of edit tools, so a file the agent wrote through a shell command is counted nowhere (ONL-2974).

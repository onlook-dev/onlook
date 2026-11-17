# AGENTS.md

Guidance for any coding agent working in this repository. Claude Code reads it through `CLAUDE.md`; Codex and Cursor read it directly.

Run `bun run verify` before opening a PR. If `main` moves while a PR is open, merge `main` into the branch and run the checks again: two PRs that each pass can still break `main` together. When `main` changes how something is done (a refactor, a new helper, a convention in these docs), new code on the branch follows it.

A PR that adds or changes an English string writes that key in every other language too (Other languages, below).

Conventions, read with this file:

@CODING.md
@WRITING.md
@ANTIPATTERNS.md
@GLOSSARY.md

## Changesets

Every PR into `main` adds a new `.changeset/*.md` with `bun run changeset`.
Write one changeset per user-facing change, in plain words, naming the feature as the UI labels it.
Use patch for a fix and minor for a feature.
A change users never see gets `bun run changeset --empty`.
Never edit or delete someone else's changeset.
See `CONTRIBUTING.md` for details.

## What this is

Onlook is an Electron desktop app for designers. A user's codebase runs in Frames on an infinite canvas, and the Onlook Agent does design work on it through Project Chat.

## Commands

Run from the repo root. Bun is the package manager and script runner, Turborepo runs the task graph, and the app itself runs on Electron's bundled Node.

| Command | What it does |
|---|---|
| `bun install` | Installs dependencies and downloads Electron. A Git worktree needs its own install: one nested under the repo root half-resolves into the root's `node_modules` and fails in confusing ways. |
| `bun dev` | Dev server and Electron window, with hot reload for the renderer. |
| `bun run verify` | Every check a PR must pass: the secret and publication scans, typecheck, unit and pty tests, the string, import, unused-code, scratch, lint and React scans, and the production build. It needs network access and full Git history. CI runs the same steps on every PR. |
| `bun run test` | `test:unit` (Bun), then `test:pty` (Node). |
| `bun test <path>` | One unit file or directory. Set `GIT_CONFIG_GLOBAL=/dev/null` if a git fixture misbehaves. |
| `node --import ./tests/apparatus/node-test-preload.ts --test --test-timeout=30000 <file.pty.ts>` | One pty test. |
| `bun run test:e2e` | Builds, then runs the Playwright suite against the built Electron app. A bare `playwright test` tests the last build, not your change. |
| `bun run test:sdk` | Tests against the real model. They spend tokens, so run them only on purpose. |
| `bun run showroom <name>` | One renderer component on scratch state (`--list` names them). |
| `bun run translate` | Translates new or changed English strings into every language with a guide in `packages/i18n/src/translate/` (`shared.md` goes with each), and prints what the run cost. `--dry-run` lists what would be sent and costs nothing; `--locale`, `--redo <key\|prefix.*>` and `--accept` are in `--help`. It spends tokens and needs `ANTHROPIC_API_KEY`. A PR doesn't wait on it: write the translations by hand (Other languages, below). |
| `bun run build:dmg` | Builds macOS installers with `scripts/cut-dmg.ts`. |

## Layout

- `apps/studio/src/main`: Electron main, one directory per module. `preload/` is everything the renderer is allowed to ask for. `renderer/` is React 19, React Flow and Astryx.
- `packages/events`: the types shared by main, preload, renderer and Playwright. Types and pure functions only; nothing from `electron`, `window` or `node:*`. `channels.ts` declares every IPC channel once, as one of three kinds: `invoke` (ask, one answer), `send` (renderer to main, no reply) or `emit` (a stream from main to the renderer). A row names the channel, its types, which views main accepts it from, whether its handler acts on the sending view's Project (`scope`, which main resolves and checks before the handler runs), and the bridge method each view gets. `ipc.ts` derives the contract types and both bridge interfaces from it, the preload builds the bridges from it, and main registers handlers through `handle` and `on` in `main/ipc/bridge.ts`.
- `packages/chat-ui`, `onboarding-ui`, `git-ui`: Astryx components with no side effects. `@studio/events` types in, JSX out. Each README states its rules.
- `tests/`: `apparatus/` (fixtures, and a library that launches and attaches to the app; a workspace package), `e2e/` (the Playwright suite), `live/` (tests that spend tokens). Unit tests live beside their module.
- `scripts/`: installer builds (`cut-dmg.ts`, `cut-windows.ts`) and the checks `verify` runs.

## How it fits together

- **Three parts, each with one job.**
  - **Main** is Onlook's background process, and the only part that touches the computer: files, programs, the network, saved state. It checks every request against the Tab that sent it.
  - **The renderer** draws Onlook's screens, one per Tab, and holds what the user is doing right now: the selection, the layout, text not yet saved. Anything outside itself it asks main for through the bridge (`preload/`), which lists every request it can make. It never reaches the disk, the network or another program on its own.
  - **Frames** run the user's own app, which Onlook does not control. Onlook's script inside each Frame (`preload/guest.ts`) draws outlines and reads the page, and talks only to the renderer, never to main.

  A feature that needs something from the computer adds a request to the bridge, and main checks it. Nothing gives the renderer a way around the bridge.
- **State flows from a typed event log.** Main turns what the agent SDKs emit into `StudioEvent`s (`packages/events/src/events.ts`), and the renderer projects that log into props. The UI never sees an SDK message object.
- **Two Harnesses behind one interface.** `main/agent-host/` hosts the Claude Agent SDK and Codex's app-server protocol behind one `AgentBackend` (`backend.ts`). Sessions are per Project.
- **The Onlook Agent never runs in the user's checkout.** `main/workspace/` creates a git worktree for every Project, and `agent-host` refuses to start anywhere that isn't in the workspace registry. Users rely on this: Onlook never changes the folder they connected.
- **Main tracks the user's dev servers.** `main/server/` records what is running and who started it. A port is added only by the Onlook Agent's `server_running` tool or by `main/starter`.
- **One window, many views.** A `BaseWindow` holds a chrome view (the top band) and one `WebContentsView` per open Tab. `main/tabs/host.ts` is the one object the rest of main calls, and `main/tabs/compose.ts` is the only module that knows how the views fit together: it builds the parts beside it (`book.ts`, `window.ts`, `view-pool.ts`, `presentation.ts`, `activation.ts`, `project-opens.ts`, `closer.ts`, `opener.ts`, `strip.ts`) and connects them. Code in main that loops over `BrowserWindow`s reaches none of these views. The band's height is `WINDOW_BAR_HEIGHT` in `packages/events`.
- **Every dev-server Frame is a page in one shared Chromium session** (`persist:studio-frames`); Artifacts load in their own, `persist:studio-artifacts` (ONL-2568). Whatever a Frame's page does runs once per Frame and counts against its session's limits, such as six HTTP/1.1 connections per host. Plan for as many Frames as the canvas allows, not for one, and count the two sessions separately (ONL-2472).
- **User-facing strings** live in `packages/i18n/src/locales/en/<prefix>.json` (`@studio/i18n`), one file per key prefix, typed through `strings.ts` there. Translator notes for each area sit in `notes/` beside it.
- **Other languages** sit beside English in `locales/<lang>/`. A PR that adds or changes English also writes that key in every other language, by hand, following `translate/shared.md`, the language's own guide and the area's translator notes, and leaves `i18n.lock` alone. `bun run translate --dry-run` lists, at no cost, every key whose translation is missing or older than its English; a hand-written one stays on that list until `bun run translate` checks it against the whole catalog. A key with no translation yet, or whose placeholders changed since, shows in English, and `check:strings` lists the second kind without failing.
- **Translation guides:** every run sends `translate/shared.md`, which applies to every language, then that language's own guide (`ja.md`, `zh-CN.md`) and the area's translator notes. A lesson from one language that others need too goes in `shared.md`. Changing a guide retranslates nothing until a run names the keys with `--redo`.
- **Language:** a Mac set to a language in `SYSTEM_LOCALES` (`packages/i18n/src/locale.ts`) opens Onlook in it; any other opens in English. `STUDIO_LOCALE=ja` or `zh-CN` (or `pseudo`) forces one in any build.
- **Renderer dev tools** live under `renderer/src/dev/`. Each is behind its own `STUDIO_*` environment variable and opens only through a hash main adds to the URL.

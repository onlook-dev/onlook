# GLOSSARY.md

Onlook's core nouns. Each means one thing in issues, docs, code and the Onlook Agent's instructions. On-screen copy may use other words, and each entry names them. Where the code still uses an older name, the entry gives it.

## The product

**Onlook.** The product, and the desktop app this repository builds. Docs, issues, the Onlook Agent's instructions and tool text, and anything a user reads call it Onlook.
- Code: the app's older name, Studio, remains in code names: `apps/studio`, `@studio/*`, `STUDIO_*`, `StudioEvent` and other types, ids and file names (ONL-3169).
- Not to be confused with: "Studio" or "Onlook Studio". Prose and screens say Onlook.

**Workspace.** A group of Projects, listed in the Left Rail. Folders the user connected with the same git remote share one Workspace; a folder with no remote, or no git history, is a Workspace of its own.
- Code: `WorkspaceSummary`, keyed by `repoIdentity`. Telemetry's `project_id` is a Workspace's hash (`workspaceTelemetryId()`); the analytics already use that name, so it stays.
- Not to be confused with: the stored `workspace*` names listed under Project, or a Bun workspace package.

**Project.** One piece of work inside a Workspace: its own Canvas, Project Chat and copy of the user's code, today a git worktree Onlook created. Opening a Project opens a Tab.
- Code: `ProjectSummary`. `WorkspaceCreated`, `workspacePath` and `workspaceName` also mean a Project; they keep their names because they are saved on disk. The module `main/workspace/` keeps its name and holds both Workspaces and Projects.
- Not to be confused with: the user's own folder, which Onlook copies from and never writes to (`source*` in code, `PickedFolder` from the picker).

**Canvas.** The board inside a Project. It has Pages and holds Frames, Artifacts, text and images.
- Code: `CanvasDoc`. Each item on it is a `CanvasNode`.

**Object.** Anything on a Canvas: a Frame, an Artifact, a text or an image. The Onlook Agent's canvas tools use this word.
- Code: `CanvasNode`.

**Page.** One page of a Canvas.
- Code: `CanvasPage`.
- Not to be confused with: a page of the user's own site, which is a route; or the web page a Frame shows, which is the Frame's page.

**Frame.** A box on the Canvas showing the user's running app, live.
- Code: `BrowserNode`, stored as `kind: 'browser'`. The renderer's node type is `'frame'`.
- On screen: also "browser".
- A Frame is an embedded webview, never an iframe.

**Artifact.** A sketch the designer makes inside a Project and keeps: its own minted id, a manifest, and a page, stored outside every git checkout so it outlives the Project it was drawn in. It renders on the Canvas in its own isolated origin, with no storage and no network.
- Code: `ArtifactNode`, stored as `kind: 'artifact'`; the record is an `ArtifactSummary` over a manifest under `stateRoot()/artifacts/<artifactId>/`. The renderer's node type is `'artifact'`, and the accent value is `artifact`.
- Not to be confused with: a Frame, which shows the user's running app over http.
- Removing the node that shows one is not deleting it; only an explicit delete destroys an artifact.

**Onlook Agent.** The AI the user works with in a Project, through Project Chat.
- Not to be confused with: a coding agent working on this repository. Context usually tells them apart. A document that mentions both names each one.

**Project Chat.** The user's conversation with the Onlook Agent in one Project. It survives a relaunch.
- Code: `SessionState`, folded from the transcript by `foldSessionState()`.
- On screen: also "conversation".
- A session is the Onlook Agent's live run behind a Project Chat. Any other kind of session is always named with its qualifier: terminal session, Chromium session, app launch.

**Harness.** Which product runs the Onlook Agent: Claude, through the Agent SDK, or Codex, through Codex's app-server.
- Code: `HarnessId`. `AgentBackend` is a running Harness. `'appserver'` in `SessionHarness` is Codex's store key, not a third Harness.
- On screen and in the Onlook Agent's words: Codex is "ChatGPT".
- Not to be confused with: a provider, which is the model service behind a Harness; or the test fixtures in `tests/apparatus`.

**Screen.** One whole screen of the app: Projects, Canvas, Onboarding. Onlook has no URLs, so it has no routes.
- Code: `Screen` in `renderer/src/activation/advance.ts`, and the diagnostics gate's `screen()`. The Canvas Screen's kind there is `'editor'`.
- Not to be confused with: the sign-in prompt, which is not a Screen. A cloud build draws it over whichever Screen a signed-out launch opens on (ONL-2950).

**Rail.** The Left Rail (Workspaces on the Projects Screen, Pages on the Canvas) and the Right Rail (Project Chat).
- Code: `rails` in `packages/events/src/tabs.ts`. Their widths are saved in `panels.json` as `sidebar` (Left) and `end` (Right).
- On screen: "Sidebar" and "chat panel".

## Electron terms that sound like ours

**Tab.** One open Project, or the Projects Screen, in the window. In Electron each Tab is a `WebContentsView`, and `main/tabs/compose.ts` composes them. Not "a view".

**Embedded webview.** The Electron `<webview>` element inside a Frame that loads the user's app, or inside an Artifact that loads its page. Not the same as a `WebContentsView`.

**Node.** React Flow's word for anything on the Canvas. Use it in code only. In prose, say Frame, Artifact, text or image, or Object for any of them.

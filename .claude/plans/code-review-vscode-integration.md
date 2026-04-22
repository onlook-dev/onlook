# Code Review: VSCode Extension WebSocket Bridge

**Reviewed**: 2026-04-16
**Branch**: main (local uncommitted changes)
**Decision**: REQUEST CHANGES

## Summary

The VSCode extension integration introduces a functional WebSocket bridge between the Onlook web client and local VSCode/Cursor extension. The core architecture is sound, but there are 2 critical security issues (token never expires, path traversal risk), 5 high-severity issues (token leaked in URL, wildcard CORS, unauthenticated /token endpoint, restart race condition, uncaught async errors), and several medium/low issues that should be addressed before shipping.

---

## Findings

### CRITICAL

**CRIT-1 — Token Never Expires After Verification**
- File: `apps/vscode-extension/src/server/security.ts:103-119`
- Once a token moves from `pendingTokens` to `verifiedTokens`, it stays there forever with no TTL and no size cap. A captured token (visible in browser history, logs, Referer headers) can be reused indefinitely to call `/stop` or reconnect via WebSocket.
- Fix: Apply `TOKEN_TTL_MS` to verified tokens, or revoke the token immediately after use in `/stop`.

**CRIT-2 — Path Traversal Risk in /stop Endpoint**
- File: `apps/vscode-extension/src/server/agent-server.ts:268-294`
- `projectPath` from the query string is passed directly to `devServerManager.stopServer()` without validation against known registered paths. Any caller with a valid token can pass arbitrary paths.
- Fix: Validate `projectPath` against the set of paths registered during WebSocket handshake. Reject unknown values.

---

### HIGH

**HIGH-1 — Token Leaked in URL Query String (sendBeacon)**
- File: `apps/web/client/src/components/store/editor/sandbox/index.ts:91`
- `navigator.sendBeacon(stopUrl)` sends the token as a URL query param, visible in browser history, HTTP logs, and Referer headers.
- Fix: Use `sendBeacon(url, new Blob([JSON.stringify({token, projectPath})], {type:'application/json'}))` and read from request body on the server side.

**HIGH-2 — Wildcard CORS on All HTTP Endpoints**
- File: `apps/vscode-extension/src/server/agent-server.ts:241-243`
- `Access-Control-Allow-Origin: *` is set unconditionally for all endpoints including `/stop` and `/token`. Any malicious website can probe these endpoints.
- Fix: Replace `'*'` with an allowlist from `this.security.allowedOrigins`.

**HIGH-3 — /token Endpoint Issues Tokens With No Authentication**
- File: `apps/vscode-extension/src/server/agent-server.ts:259-265`
- Any localhost caller can `GET /token?projectId=<anything>` and receive a valid token. Combined with wildcard CORS, this enables CSRF-style attacks.
- Fix: Restrict `/token` to known origins, or require an `X-Onlook-Secret` header set at extension startup.

**HIGH-4 — Race Condition in stopServer: Entry Deleted Before Process Exit**
- File: `apps/vscode-extension/src/project/dev-server.ts:204-218`
- `stopServer()` deletes the entry from `this.servers` before the process has actually exited. If `restartServer()` calls `startServer()` immediately after, the port may still be bound by the dying process, causing the port check to fail.
- Fix: Wait for the `exit` event before resolving `stopServer()`, or add a short delay before the port check in `startServer()`.

**HIGH-5 — Uncaught Error in Async onOutput Callback**
- File: `apps/vscode-extension/src/server/agent-server.ts:520-526`
- The `onOutput` callback passed to `startServer()` calls `this.broadcastEvent()` which may throw if the WebSocket is in a bad state. This error is not caught and will crash the promise chain.
- Fix: Wrap the callback body in a try/catch.

**HIGH-6 — Pseudoterminal Shell Args Incorrect + `any` Type**
- File: `apps/vscode-extension/src/project/terminal-manager.ts:54-57`
- `spawn('/bin/sh', ['-l'])` with `stdio: ['pipe','pipe','pipe']` spawns a login shell but immediately exits because there's no TTY and no command. The shell needs `-i` (interactive) or a persistent loop to stay alive.
- The `shellProcess` field is typed as `any`.
- Fix: Use `spawn('/bin/sh', ['-i'], { stdio: ['pipe','pipe','pipe'] })` or use `node-pty` for proper PTY support. Type `shellProcess` as `ChildProcess`.

---

### MEDIUM

**MED-1 — sendText vs PTY stdin Inconsistency**
- File: `apps/vscode-extension/src/project/terminal-manager.ts:166`
- `writeTerminal()` calls `entry.terminal.sendText(data)` which sends to the VSCode terminal UI, but the Pseudoterminal's `handleInput()` writes to `shellProcess.stdin`. These are two different paths; `sendText` on a PTY-backed terminal calls `handleInput`, so this may work, but it's fragile.
- Fix: Document the expected flow or call `shellProcess.stdin.write(data)` directly.

**MED-2 — Shell Process Orphaned on killTerminal**
- File: `apps/vscode-extension/src/project/terminal-manager.ts:147-153`
- `killTerminal()` calls `entry.terminal.dispose()` which triggers `close()` on the PTY, but only if VSCode calls it. If the terminal is already closed, the shell process may be orphaned.
- Fix: Store a reference to the PTY instance in `TerminalEntry` and call `pty.close()` explicitly in `killTerminal()`.

**MED-3 — Restart Silently Resets devCommand**
- File: `apps/vscode-extension/src/project/dev-server.ts:235`
- `restartServer()` passes `devCommand: targetCommand` where `targetCommand` may be `undefined` if no new command was provided. `startServer()` then falls back to `DEFAULT_DEV_COMMAND`, silently discarding the previously used command.
- Fix: Read the command from the existing `entry` when no new command is provided: `const targetCommand = devCommand ?? entry.devCommand`.

**MED-4 — parseInt Edge Cases in Port Input**
- File: `apps/web/client/src/components/ui/settings-modal/local-dev/index.tsx:171`
- `Number(formData.port)` on an empty string returns `0`, which passes `isNaN` but fails the range check. However `formData.port` is typed as `number` but the `onChange` handler passes `e.target.value` (a string). This type mismatch may cause silent coercion issues.
- Fix: Use `parseInt(formData.port.toString(), 10)` and validate explicitly.

**MED-5 — Single Subscriber Only for onOutput**
- File: `packages/code-provider/src/providers/local/index.ts:382`
- `registerTerminalOutput('dev', callback)` uses `Map.set()` which overwrites any existing callback. If two components call `task.onOutput()`, the first callback is silently dropped.
- Fix: Use an array of callbacks or an EventEmitter pattern.

**MED-6 — Dev Server May Start Twice on Reconnect**
- File: `apps/web/client/src/components/store/editor/sandbox/index.ts:109`
- `startLocalDevServer()` is called inside the `reaction()` on `provider` becoming available. If the provider disconnects and reconnects (e.g., page refresh), the reaction fires again and calls `DEV_SERVER_START` a second time. `startServer()` has a guard for `status === 'running'` but not for `status === 'starting'`.
- Fix: Add `'starting'` to the guard condition in `startServer()`.

---

### LOW

**LOW-1 — Startup Timeout Doesn't Kill Process**
- File: `apps/vscode-extension/src/project/dev-server.ts:127`
- On 30s startup timeout, the promise rejects but the spawned process is not killed. It continues running and consuming the port.
- Fix: Call `devProcess.kill()` before rejecting.

**LOW-2 — Overly Broad Ready-String Detection**
- File: `apps/vscode-extension/src/project/dev-server.ts:139`
- Matching `output.includes('Ready')` will false-positive on any log line containing the word "Ready" (e.g., "Database Ready", "Cache Ready").
- Fix: Use more specific patterns like `output.includes('ready on') || output.includes(`localhost:${targetPort}`)`.

**LOW-3 — stopAll() on Disconnect Affects All Clients**
- File: `apps/vscode-extension/src/server/agent-server.ts:400`
- `this.fileWatcherManager?.stopAll()` on any client disconnect stops file watching for ALL clients, not just the disconnecting one.
- Fix: Track which paths each client is watching and stop only those.

**LOW-4 — NaN from parseInt Not Validated**
- File: `apps/web/client/src/components/store/editor/sandbox/index.ts:78`
- `parseInt(localAgent, 10)` can return `NaN` if the URL param is malformed. `this.agentPort` would be `NaN`, causing `sendBeacon` to construct an invalid URL.
- Fix: Add `if (!isNaN(port)) this.agentPort = port;`.

**LOW-5 — LocalTask.open() Returns ID Not Logs**
- File: `packages/code-provider/src/providers/local/index.ts:797`
- `open()` returns `this._id` (the string `'dev'`). `CLISessionImpl.initTask()` writes this string to the xterm display, so users see "dev" as the first terminal output.
- Fix: Return an empty string or a welcome message instead.

**LOW-6 — onDidClose Not Implemented on Pseudoterminal**
- File: `apps/vscode-extension/src/project/terminal-manager.ts:30`
- `OnlookPseudoterminal` doesn't expose `onDidClose`. VSCode uses this to know the terminal has finished; without it the terminal UI may remain open after the shell exits.
- Fix: Add `readonly onDidClose: vscode.Event<number> = this.closeEmitter.event;`.

---

## Validation Results

| Check | Result |
|---|---|
| Web client typecheck (`bun --filter @onlook/web-client typecheck`) | Pass |
| VSCode extension typecheck (`npx tsc --noEmit`) | Pass |
| Lint | Skipped |
| Tests | Skipped |
| Build | Skipped |

---

## Files Reviewed

| File | Change |
|------|--------|
| `apps/vscode-extension/src/server/agent-server.ts` | Modified |
| `apps/vscode-extension/src/server/protocol.ts` | Modified |
| `apps/vscode-extension/src/server/security.ts` | Existing (reviewed for context) |
| `apps/vscode-extension/src/project/dev-server.ts` | Modified |
| `apps/vscode-extension/src/project/terminal-manager.ts` | Modified |
| `apps/web/client/src/components/store/editor/sandbox/index.ts` | Modified |
| `apps/web/client/src/components/store/editor/sandbox/session.ts` | Modified |
| `apps/web/client/src/app/projects/page.tsx` | Modified |
| `apps/web/client/src/app/projects/_components/top-bar.tsx` | Modified |
| `apps/web/client/src/components/store/create/manager.ts` | Modified |
| `apps/web/client/src/components/ui/settings-modal/helpers.tsx` | Modified |
| `apps/web/client/src/components/ui/settings-modal/with-project.tsx` | Modified |
| `apps/web/client/src/components/ui/settings-modal/local-dev/index.tsx` | Added |
| `packages/code-provider/src/index.ts` | Modified |
| `packages/code-provider/src/providers/local/index.ts` | Modified |
| `packages/models/src/project/branch.ts` | Modified |
| `packages/db/src/schema/project/branch.ts` | Modified |
| `packages/db/src/mappers/project/branch.ts` | Modified |
| `packages/db/src/defaults/branch.ts` | Modified |

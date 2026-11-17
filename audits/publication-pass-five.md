# Publication security review, pass five

Reviewed on November 3, 2026 for ONL-2877. The starting revision was
`80a2bd576c11859118269e99d91e460cb83e44b5`. This is a bounded source and
offline-behaviour review, not a penetration-test certificate.

## Threat model

Assets are the user's files, project and terminal content, account credentials,
agent authority, and integrity of the installed application. Inputs include a
hostile project, a guest page, agent output, a crafted deep link, renderer IPC,
and dependency code. The attacker may know all published source. A guest page
and its subframes must not acquire main-process capabilities. A Tab request
must use main's project association, not a caller-selected filesystem root or
another Tab's guest ID. Chrome has window and Tab controls, not project tools.

The trusted computing base includes Electron, the app bundle, main, both agent
runtimes, installed providers and the user's account on the computer. A
worktree is not an OS sandbox. Terminal commands and approved agent work can
access the computer. A fully compromised application renderer can request
normal UI actions, including opening an already registered Project; the
per-request project checks below are not an account-isolation boundary between
all locally known Projects. No claim here changes that product contract.

## Confirmed findings and fixes

### IPC sender and view authority (CWE-862)

The channel vocabulary is `packages/events/src/ipc.ts`; the exposed entry
points are `preload/index.ts`, `preload/chrome.ts` and the guest preload.
Previously most main handlers trusted Electron delivery and TypeScript types.
The direct-handler probe reached `appFlags` as an unregistered guest and as
chrome. Registration now goes through `main/ipc/bridge.ts`: the exact live
WebContents must be a registered app view, its sending frame must be its main
frame, and chrome may use only its explicit channel list. Invalid invokes
reject and invalid sends are dropped before callbacks run. Chrome identity is
assigned explicitly when its view is created, not inferred from IPC arguments.

`main/ipc/bridge.test.ts` exercises every invoke/send constant with guest and
subframe senders, plus malformed send events and allowed chrome controls.
`main/ipc-security.test.ts` also invokes actual app handler registrations.
`scripts/check-imports.ts` rejects direct Electron IPC registrations outside
the bridge directory. This guard does not replace payload validation inside
individual handlers, nor does it make all trusted renderer APIs harmless.

### Caller-selected projects, blobs and Canvas guests (CWE-639)

The location and session-start paths could update the view registry before
checking whether the requested root was a Studio workspace. Drafts, images,
Canvas camera operations and Code mapping could address another Project's
state by caller-supplied cwd, blob ID or document ID. Renderer frame evidence
could claim a webContentsId belonging to a different Tab.

Location and session start now require a registered workspace before changing
the authority map. Drafts and image access require the asking view's project;
image reads also require a project attachment reference. Canvas operations and
Code mapping require that view's document. Frame evidence retains a guest ID
only when Electron identifies a live webview hosted by that same sender.
Unknown roots, guessed IDs and cross-project requests have no intended effect.

Evidence: `main/ipc/project-security.test.ts` and
`main/images/ipc-security.test.ts`. Tests cover foreign roots, read/write
drafts, persisted cameras, forged guest IDs, Code mapping and valid own-project
drafts, images and cameras. Existing Code read/write/scope tests cover absolute
paths, traversal and canonical symlink containment; artifact protocol tests
cover escaped paths and symlinks. Native file pickers remain an explicit user
grant outside the project. Image picking rechecks project ownership after the
dialog completes. Deferred-dialog regressions also exposed a stale attachment
picker: it could continue reading files after the view changed Project, closed,
or the Project's attachment generation changed. Both pickers now cancel before
reading any selected path in those cases.

### Terminal replay, control and output routing (CWE-862)

Terminal snapshots were global, predictable IDs could control another
Project's session, and output from a Project without an open view fell back to
all renderers. Main now derives an owner from the asking view's registered
Project, or that exact view on Home. Creation no longer repoints the view's
project from a terminal cwd. Snapshot, input, resize and disposal enforce the
owner; output never falls back to unrelated Tabs. Buffered replay remains
available to a Project that reopens. Terminal dimensions, strings and input
size are checked at the IPC boundary.

Evidence: `main/terminal/ipc-security.test.ts`, `index.test.ts`, and existing
registry/session tests. These tests do not spawn an agent or launch Studio.

### Vulnerable runtime dependency closure

The installed MCP SDK resolves Express/body-parser, AJV/fast-uri,
express-rate-limit/ip-address, qs and Zod. The initial production dependency
audit reported these advisory ranges. This pass pins body-parser 2.4.0,
fast-uri 3.1.9, ip-address 10.7.4, qs 6.16.1 and Zod 4.6.6, retaining the
existing SDK version and supply-chain cooldown. The resolved-runtime tests
fail against the original versions; the qs non-callable `toString` reproducer
also throws before the update and succeeds afterward.

References: GitHub advisories GHSA-27r3-jxmh-p828,
GHSA-w74x-v6f9-j3xg, GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr,
GHSA-333x-w4r6-6crp, GHSA-rxp7-6hxx-x8q5, GHSA-6pq8-jhm2-2vcw and
GHSA-mrhx-c7xc-m3w5. The final `bun audit --production --json` reports `{}`.
`main/ipc/dependencies-security.test.ts` resolves through the actual app/MCP
dependency chain, not root-level lookalikes. This is a confirmed vulnerable
dependency inclusion, not a claim that all advisory payloads were remotely
reachable through Studio's stdio MCP transport.

## Other surfaces checked

### Deep links and custom protocols — no additional finding

Threat: a link starts commands, selects files or smuggles credentials into
account state. `telemetry/attribution-links.ts` accepts only bounded
`onlook://attribution` links, rejects credentials, ports, fragments and other
routes, and routes only to marketing attribution. Attribution is not auth.
`electron-builder.official.yml` registers that scheme and no document-open
association. Source builds register no custom protocol.
The open-url, startup argv and second-instance paths share the parser.
Evidence: `telemetry/attribution.test.ts` and `report/attribution.test.ts`.

Artifact and thumbnail protocol handlers separately require registered IDs,
canonical contained paths and expected files. Artifact serving uses manifest
membership and a dedicated session; thumbnail serving is not installed in
guest sessions. Evidence: `artifacts/protocol.test.ts`, `session.test.ts`,
`privacy-workflow.test.ts`, and the thumbnail protocol suite.

### Auto-update — no additional source finding

Threat: an untrusted renderer or feed swaps the publisher, installs an older
release, or changes channels. `updater/index.ts` enables packaged official
updates from the bundle's generic HTTPS feed. Source builds disable updates;
`electron-builder.official.yml` owns the official feed configuration.
Renderer IPC exposes status and restart, not
feed, channel or version configuration. Installed electron-updater 6.8.9
defaults `allowDowngrade` to false; Studio never enables it or sets a runtime
channel. The shipped channel remains unchanged. The session state machine
does not advertise a ready update before download staging completes.
Evidence: updater location/check/machine/session tests with injected adapters.

Limit: adapter tests do not establish Apple's signature verification,
Gatekeeper, notarization, TLS trust on the user's machine, actual updater
rollback behavior, or continuity of the publisher's signing identity. No
signed app, update service, release feed or signing settings were touched.

### Cloud auth and provider slot — no additional finding

Threat: credentials leak to disk/renderer, an OAuth callback is forged, a late
refresh restores a signed-out account, or an untrusted provider gains main
authority. `cloud/providers/official/tokens.ts` uses safeStorage encryption,
fails closed without a secure backend and removes legacy plaintext. Token
revision checks invalidate late refresh/decrypt writes after sign-out. WorkOS
uses a loopback-only callback, PKCE, state checks and one-shot consumption.
The provider is a build-selected trusted main module, not a sandboxed plugin
slot; putting arbitrary code there would grant main-process authority.

Evidence: `identity/tokens.test.ts`, `tokens-revision.test.ts`,
`workos-tokens.test.ts`, `workos.test.ts` and cloud provider tests. Providers,
safeStorage and HTTP are injected; no real account or provider was called.
An encrypted file is not the same as a keychain item: security depends on the
OS safeStorage backend and permissions on the user's account. Native keychain
access on a signed build is outside this offline result.

### Telemetry, logs and crashes — no additional finding

Threat: project text, paths or credentials leave through telemetry, exception
events, log exports or crashes. `telemetry/ipc.ts` picks allowed fields rather
than spreading renderer objects. `packages/events/src/log.ts` defines content
keys to omit and FILE_ONLY_KEYS; `log/index.ts` scrubs nested values and removes
file-only fields before passing records to `log/export.ts`. Renderer logs pass
runtime shape checks and the same scrubber. Crash reporting is local-only
(`uploadToServer: false`), uses a restricted directory and pruning, and sends
only coarse crash metadata separately. Replay and request filtering mask
content and local paths.

Source builds wait for an explicit telemetry choice. The guarded consent query
preserves unknown, accepted, declined and build-removed answers; it does not
infer them from the legacy analytics preference. Build-time removal substitutes
disabled telemetry and log-export modules. Evidence: `telemetry/source-consent.test.ts`,
`telemetry/build.test.ts` and `main/ipc-security.test.ts`.

Evidence: telemetry IPC/events/renderer-requests/attribution tests and
log index/file/export tests, with fake transports. This is review of the
supported structured producers and key-based scrubber, not a guarantee that
arbitrary secrets placed in a free-text log message can be recognized. No
PostHog settings or real telemetry endpoints were used.

### Agents, MCP tools and artifacts — no additional finding beyond ownership

Threat: project-controlled executable configuration, arbitrary CDP targets,
ungranted artifact access, or active agent HTML/markdown acquires app authority.
Claude loads user settings rather than project executable settings; Studio
owns hooks and controls MCP connectors. Project instruction/skill discovery
checks canonical containment and size budgets. MCP tools validate their
schemas and bind callbacks to the session worktree. Artifact grants are
explicit and project/session scoped.

HTML artifacts deliberately run scripts, not sanitized inert markup: the
security boundary is a bridge-free sandboxed guest, an offline-only CSP and a
separate session. Markdown uses the pinned Astryx parser's escaped React text
and scheme filtering rather than raw HTML injection; Chat cancels its default
link navigation, app navigation is denied, and external opening is limited to
HTTP(S). Renderer CSP limits image origins. The new sender guard is defence
in depth, not a substitute for those controls.

Evidence: project-context, appserver resolve-security, artifact access/grants/
privacy/protocol/session tests and canvas CDP tests. External agent commands
and user-enabled connectors remain trusted capabilities on the computer, not
a worktree sandbox. No real agent provider was exercised.

## Rechecking the first pass's evidence limits

- **Codex ancestors and resume:** `agent-host/appserver/session.ts` passes the
  exact worktree's `projects.<cwd>.trust_level = "untrusted"` startup override.
  Fresh and resumed threads carry the same cwd, approval policy/reviewer and
  explicit sandbox policy. The scripted-wire session tests assert those
  parameters, and executable-resolution tests reject symlink/descriptor
  escapes. They do not prove how every installed native Codex version resolves
  ancestor configuration or saved resume settings. No native provider launch
  is claimed. Studio currently requests `danger-full-access`; approvals are
  not an OS filesystem sandbox.
- **Signed runtime:** source fuses, entitlements, navigation/session guards and
  signature-continuity checks were inspected without changing them. Unit/VM
  tests are not a signed-runtime test.
- **ASAR dependencies:** `electron-builder.yml` includes built output and the
  app's runtime dependencies; bundled workspace code is built by Vite. The
  resolved external dependency closure and production audit were rechecked
  and patched above. After the production build, electron-builder 26.15.3's
  Bun collector ran against `apps/studio` and its 111 production packages
  were copied with the built output into a resource-only ASAR. Extracting
  package manifests from that archive confirmed all five patched versions
  listed above. This is archive
  inclusion evidence, not a signed installer: native unpacking, platform
  pruning and signing hooks were not exercised. It cannot attest to the
  exact ASAR inside a future signed release. This pass does not certify an
  existing customer artifact or publish a replacement.

## Reproduction and evidence

Run the normal repository gates (`bun run test`, `bun run verify`). The new
publication-named regressions run without Electron windows or real providers.
The existing `test:report` script produces a JUnit report for the committed
revision. Tests in `apps/studio/src/main/ipc-security.test.ts`,
`apps/studio/src/main/ipc/bridge.test.ts`,
`apps/studio/src/main/ipc/project-security.test.ts`,
`apps/studio/src/main/images/ipc-security.test.ts`,
`apps/studio/src/main/terminal/ipc-security.test.ts` and
`apps/studio/src/main/ipc/dependencies-security.test.ts` cover the confirmed
findings. Before the fixes, these regressions exposed unauthorized sender,
project, attachment and terminal access, vulnerable dependency versions and
stale file-picker completion. After the fixes, the same assertions pass,
including successful operations by the owning view. Run-specific receipts
and archive inventory details are recorded in the fixing PR, not required
to interpret or rerun these source tests.

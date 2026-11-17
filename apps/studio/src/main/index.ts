import { mkdirSync } from 'node:fs';
import { flag } from '@onlook/cloud-provider';
import { primeFlags } from './flags/index.js';
import { applyChromiumLanguage, chooseLocale } from './locale/index.js';
import { registerProjectSetup } from './project-setup/index.js';
import { disposeProjectSetup, beginProjectSetupQuit } from './project-setup/service.js';
import { join } from 'node:path';
import { app, autoUpdater, BrowserWindow, crashReporter, dialog, protocol, screen, session } from 'electron';
import { off, on } from './ipc/bridge.js';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import { IPC_EMIT, IPC_SEND } from '@studio/events';
import { disposeAgentHost, noteClaudeSetupChanged, noteCodexSetupChanged, registerAgentHost } from './agent-host/index.js';
import { flushTranscripts, shutdownTranscripts, transcriptPersistenceStatus } from './agent-host/transcript.js';
import { COMMIT_SHA } from './build-info.js';
import { buildIdentity, OFFICIAL_BUILD } from './build-kind.js';
import { flushCanvas, registerCanvasHandlers } from './canvas/index.js';
import { installArtifacts } from './artifacts/index.js';
import { artifactSchemeRegistration } from './artifacts/protocol.js';
import { installThumbnailProtocol, registerThumbnailScheme } from './canvas/thumbnail/protocol.js';
import { cancelClaudeLoginForQuit, recheckClaudeAfterUnauthenticated, registerClaudeHost, startClaudeBootPreCheck } from './claude/index.js';
import { primeUserEnv } from './env/shell-env.js';
import { registerIdentityHandlers } from './identity/ipc.js';
import { registerOnlookHandlers, initializeOnlook, disposeOnlook } from './cloud/index.js';
import { registerImageHandlers } from './images/index.js';
import { identity as providerIdentity } from '@onlook/cloud-provider';
import { capabilities } from './cloud/capabilities.js';
import { diagnosticsPort } from './diagnostics/gate.js';
import { registerDiagnosticsHandlers } from './diagnostics/index.js';
import { installPerfProbe } from './perf/probe.js';
import { startResourceSampling } from './perf/sampler.js';
import { registerIpcHandlers } from './ipc.js';
import { installApplicationMenu } from './menu/index.js';
import { registerLocationHandlers } from './location/index.js';
import { registerCodexHost, startCodexBootPreCheck } from './codex/index.js';
import { registerOnboardingHandlers } from './onboarding/index.js';
import { registerAppCommandHandlers } from './app-commands/index.js';
import { registerTaskManagerHandlers } from './task-manager/window.js';
import { registerPanelsHandlers } from './panels/index.js';
import { registerReportHandlers } from './report/index.js';
import { registerSidebarLayoutHandlers } from './sidebar-layout/index.js';
import { t } from '@studio/i18n';
import { anyUnsavedCode } from './code/dirty.js';
import { registerCodeHandlers } from './code/index.js';
import { registerDraftsHandlers } from './drafts/index.js';
import { registerSettingsHandlers } from './settings/index.js';
import { stampTipsBaseline } from './settings/state.js';
import { projectCount } from './workspace/store.js';
import { installFramePolicies, registerFrameHandlers } from './frames/index.js';
import { gitStatusCadence, registerGitStatusCadence } from './git-status/cadence.js';
import { registerGitStatusHost } from './git-status/index.js';
import { disposeServerBook, registerServerBook } from './server/index.js';
import { disposeStarter, registerStarter } from './starter/index.js';
import { sweepBlankBuckets } from './workspace/blank.js';
import { registerBlankCreateHandlers } from './workspace/create-blank.js';
import { registerWorkspaceHandlers } from './workspace/index.js';
import { registerGithubImportHandlers } from './github-import/index.js';
import { initAutoUpdater, registerUpdaterHandlers } from './updater/index.js';
import { offerMoveToApplications } from './updater/location.js';
import { beginTurnSeenQuit } from './telemetry/turn-seen.js';
import { beginTelemetryQuit, capture, correlation, noteAppShown, prepareTelemetry, receiveWebAttribution, shutdownTelemetry } from './telemetry/index.js';
import { registerAttributionLinks } from './telemetry/attribution-links.js';
import { checkSetupAbandoned } from './telemetry/setup-step.js';
import { installProcessHooks } from './errors/index.js';
import { registerDevErrorHook } from './errors/dev-hook.js';
import { claimRunningMarker, clearRunningMarker, ownsRunningMarker } from './errors/crash-marker.js';
import { pruneCrashDumps } from './errors/crash-dumps.js';
import { stateRoot } from './state/root.js';
import { flushLog, initLog, log } from './log/index.js';
import { registerLogHandlers } from './log/ipc.js';
import { flushAllDomains, reportStateFaultsTo } from './state/store.js';
import { createQuitTeardown } from './quit-teardown.js';
import { rememberWindow, restoreWindowOptions, wasMaximized } from './window/bounds.js';
import { waitForFilledScreen, type FilledScreenOutcome } from './window/show-gate.js';
import { protectAppContents, everyRenderer, isAuxiliaryWindow, presentPrimaryWindow } from './window/host.js';
import { appViewPreferences } from './window/preferences.js';
import { registerTelemetryHandlers } from './telemetry/ipc.js';
import { broadcastToRenderers } from './tabs/broadcast.js';
import { createTabHost, tabHost, type TabHost } from './tabs/host.js';
import { browserSessionPath } from './state/browser.js';
import { isMac } from './env/platform.js';
import { devSwitches, rendererDevServerUrl } from './env/dev-switches.js';

// Read before anything async, so `startup_ms` is what a user waits for.
const processStartedAt = Date.now();
// The leaves take what they need from above here, lowest first, before anything below runs.
reportStateFaultsTo(log('state'));
const bootLog = log('boot');
const identity = buildIdentity(OFFICIAL_BUILD);
app.setName(OFFICIAL_BUILD ? (app.isPackaged ? identity.appId : 'Onlook Development') : identity.productName);

// Before `ready`; after that the switch is never read. An env var because electron-vite spawns Electron itself.
const cdpPort = diagnosticsPort();
if (cdpPort) app.commandLine.appendSwitch('remote-debugging-port', cdpPort);
applyChromiumLanguage();

// Chromium throttles a never-shown window's renderers until `executeJavaScript` stops answering and a frame capture never settles; Playwright's launcher passes these, a hand-run one does not (ONL-2374, ONL-2311).
if (devSwitches.agentHeadless !== undefined) {
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
}

// State stays under 'Onlook Studio' though the app presents as 'Onlook': the derived path is one v1 may own (ONL-2132). `scripts/reset-identity.ts` mirrors this pin.
if (!app.commandLine.hasSwitch('user-data-dir')) {
  const pinnedUserData = join(app.getPath('appData'), identity.dataFolder);
  mkdirSync(pinnedUserData, { recursive: true });
  app.setPath('userData', pinnedUserData);
  const sessionData = browserSessionPath(pinnedUserData, app.isPackaged);
  mkdirSync(sessionData, { recursive: true });
  app.setPath('sessionData', sessionData);
}

// `STUDIO_STATE_ROOT` and `AGENT_HEADLESS` bypass the lock (ONL-1913); a drive setting neither writes the real user-data directory.
const hasSingleInstanceLock =
  devSwitches.stateRoot !== undefined ||
  devSwitches.agentHeadless !== undefined ||
  app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  if (capabilities().links) registerAttributionLinks(app, receiveWebAttribution);
  app.on('second-instance', () => {
    presentPrimaryWindow();
  });
}

// Module scope: `registerSchemesAsPrivileged` is process-wide and is no longer read once the app is ready (ONL-2471).
// One call carries every scheme: it can be called only once (ONL-2568).
registerThumbnailScheme((schemes) =>
  protocol.registerSchemesAsPrivileged([...schemes, artifactSchemeRegistration()]),
);

// A backstop, not a budget: 3000 put the flash back on slower hardware (ONL-1948).
const SHOW_WITHOUT_REPORT_MS = 4_000;

// Every source, not the first: showing on whichever painted first is the half-filled window (ONL-2206).
function showWhenFilled(sources: readonly Electron.WebContents[]): Promise<FilledScreenOutcome> {
  const pending = new Set(sources);
  return waitForFilledScreen(
    {
      onReport: (listener) => {
        const handler = (event: Electron.IpcMainEvent): void => {
          listener(event.sender);
        };
        on(IPC_SEND.uiReady, handler);
        return () => off(IPC_SEND.uiReady, handler);
      },
      isExpectedSource: (source) => {
        pending.delete(source as Electron.WebContents);
        return pending.size === 0;
      },
      onRendererGone: (listener) => {
        for (const source of sources) source.once('render-process-gone', listener);
      },
    },
    SHOW_WITHOUT_REPORT_MS,
  );
}

// No session refresh under an agent run: the token read's Keychain prompt would hang it. Headless is decided here because no launcher can suppress `show()` from outside.
function finishBoot(bootOutcome: FilledScreenOutcome, show: () => void): void {
  const headless = devSwitches.agentHeadless !== undefined;
  if (!headless) show();
  noteAppShown({ startupMs: Date.now() - processStartedAt, bootOutcome });
  startResourceSampling();
  void initializeOnlook();
  if (headless) return;
  void providerIdentity.refreshSession();
}

// `is.dev` is `!app.isPackaged`, so a shipped build cannot produce these hashes. `STUDIO_DIAGNOSTICS` is not gated on it: the node-pty check only fails packaged.
function instrumentHash(): string | undefined {
  const chatFixture = is.dev ? devSwitches.chatFixture : undefined;
  const onboarding = is.dev ? devSwitches.onboarding : undefined;
  const showroom = is.dev ? devSwitches.showroom : undefined;
  const projects = is.dev ? devSwitches.projects : undefined;
  return chatFixture
    ? `chat-fixture:${chatFixture}`
    : onboarding
      ? `onboarding:${onboarding}`
      : projects
        ? projects === '1' ? 'projects' : `projects:${projects}`
        : showroom
          ? `showroom:${showroom}`
          : devSwitches.diagnostics === '1'
            ? 'diagnostics'
            : undefined;
}

function createTabbedWindow(): TabHost {
  const host = createTabHost();
  host.open();
  // After home, so `order[0]` is home and the restored chips follow it (ONL-2208).
  host.restoreSaved();

  // No `ready-to-show` here: a `BaseWindow` has no page and never emits it, so a show hung on it never happens.
  void (async () => {
    finishBoot(await showWhenFilled(host.firstPaintSources()), () => host.show());
    // Only once the window is up: a mint during boot competes with the surface the user is waiting for (ONL-2318).
    host.armSpare();
  })();

  return host;
}

function createWindow(): BrowserWindow {
  const displays = screen.getAllDisplays().map((display) => display.workArea);
  const window = new BrowserWindow({
    ...restoreWindowOptions(displays),
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isMac() ? 'hiddenInset' : 'default',
    backgroundColor: '#0a0a0a',
    webPreferences: appViewPreferences(join(import.meta.dirname, '../preload/index.cjs'), {
      webviewTag: true,
    }),
  });
  // `once`: the event fires again on every canvas guest paint, and `show()` on a visible window yanks the desktop back to Studio (ONL-1992).
  window.once('ready-to-show', async () => {
    const bootOutcome = await showWhenFilled([window.webContents]);
    finishBoot(bootOutcome, () => {
      // Before `show()`, or the window appears at its restored rectangle and snaps.
      if (wasMaximized()) window.maximize();
      window.show();
    });
  });

  // `getBounds()` reports the screen while maximized; persisting it makes un-maximizing restore fullscreen-sized forever.
  const remember = (): void => {
    if (window.isDestroyed()) return;
    rememberWindow({ bounds: window.getNormalBounds(), isMaximized: window.isMaximized() });
  };
  // `resized`/`moved` are macOS-only and fire only after a user drag; `setBounds()` persisted nothing through them.
  window.on('resize', remember);
  window.on('move', remember);
  window.on('maximize', remember);
  window.on('unmaximize', remember);

  protectAppContents(window.webContents, { allowGuests: true });

  const hash = instrumentHash();

  const devServerUrl = rendererDevServerUrl();
  if (is.dev && devServerUrl) {
    void window.loadURL(hash ? `${devServerUrl}#${hash}` : devServerUrl);
  } else {
    void window.loadFile(join(import.meta.dirname, '../renderer/index.html'), { hash });
  }

  return window;
}

void app.whenReady().then(() => {
  // The second instance already called `app.quit()`; opening a window on the way out races the teardown.
  if (!hasSingleInstanceLock) return;

  electronApp.setAppUserModelId(identity.appId);

  // macOS renders `applicationVersion` as the Version line and `version` as the build beside it.
  app.setAboutPanelOptions({
    applicationName: t('app.name'),
    applicationVersion: app.getVersion(),
    version: COMMIT_SHA,
  });

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // First and not awaited: the shell probe pays while the window comes up, and `userEnv()` keeps any spawn behind it (ONL-1871).
  primeUserEnv();

  if (is.dev && isMac()) {
    app.dock?.setIcon(join(import.meta.dirname, '../../build/icon.png'));
  }

  // First: the launch and install ids exist before any window, so the logger, the crash marker and every early error carry them (ONL-2343, ONL-2352).
  initLog({ mirror: !app.isPackaged });
  // Flags before telemetry: activation reads `web-attribution-link` to decide a retained handoff, and an unprimed read answers from the baked default whatever Cloud targets (ONL-3080).
  primeFlags(flag);
  chooseLocale();
  prepareTelemetry();
  registerLogHandlers((receive) => on(IPC_SEND.logLine, (_event, payload) => receive(payload)));
  installProcessHooks();
  // Dumps stay local and 0700 like the log file; nothing uploads them.
  const crashDumps = join(stateRoot(), 'crashes');
  mkdirSync(crashDumps, { recursive: true, mode: 0o700 });
  app.setPath('crashDumps', crashDumps);
  crashReporter.start({ uploadToServer: false });
  setImmediate(() => pruneCrashDumps(crashDumps));
  // Only a launch that owns the state root it writes may claim the marker.
  const ids = correlation();
  if (ids !== undefined && ownsRunningMarker()) {
    const previous = claimRunningMarker(ids.launchId, app.getVersion());
    if (previous !== undefined) {
      bootLog.warn('the previous launch did not quit cleanly', { previous_launch_id: previous.launchId });
      capture('crash_detected', {
        previous_launch_id: previous.launchId,
        app_version: previous.appVersion,
        reporter_app_version: app.getVersion(),
      });
    }
  }
  // Before any host or window: a move quits this copy, and nothing it started should outlive it (ONL-2641).
  if (offerMoveToApplications()) return;
  registerIpcHandlers();
  registerDiagnosticsHandlers();
  installPerfProbe();
  // Before the agent host, which consults the workspace registry on every `session.start` (ONL-1829).
  registerWorkspaceHandlers({
    reserveOpen: (viewId, workspacePath) => tabHost()?.reserveProjectOpen(viewId, workspacePath) ?? false,
    releaseOpen: (viewId, workspacePath) => tabHost()?.releaseProjectOpen(viewId, workspacePath),
  });
  registerGithubImportHandlers();
  // The handlers the renderer asks at mount register before the window: a later registration races a fast load.
  registerOnboardingHandlers();
  registerIdentityHandlers();
  registerOnlookHandlers();
  registerLocationHandlers();
  registerAppCommandHandlers();
  registerTaskManagerHandlers();
  registerPanelsHandlers();
  registerSidebarLayoutHandlers();
  registerCodeHandlers();
  registerDraftsHandlers();
  stampTipsBaseline(projectCount);
  registerSettingsHandlers();
  registerReportHandlers();
  // Before the agent host, whose tools write through the canvas host (ONL-1993).
  registerCanvasHandlers();
  // The default session, named here: the handler is per-session, and canvas guests live in the frames partition (ONL-2471).
  installThumbnailProtocol(session.defaultSession.protocol);
  // Its own session, so the frames partition keeps having no artifact handler (ONL-2568).
  installArtifacts();
  // Before the agent host: a report into no book returns success to the model and drops silently. The starter is handed in, or every starter runs as `agent-started` (ONL-2152).
  // After `app` is ready, which `utilityProcess.fork` requires.
  registerServerBook({ starter: registerStarter() });
  registerProjectSetup();
  registerBlankCreateHandlers({
    begin: () => tabHost()?.beginDraftCreation() ?? false,
    finish: () => tabHost()?.setDraftCreating(false),
    open: (workspace) => tabHost()?.revealWorkspace(workspace) ?? false,
  });
  registerUpdaterHandlers();
  registerCodexHost({ onState: (state) => noteCodexSetupChanged(state.status) });
  startCodexBootPreCheck();
  registerClaudeHost({ onState: (state, meta) => noteClaudeSetupChanged(state, meta) });
  registerTelemetryHandlers();
  registerDevErrorHook();
  // Before the agent host, which writes captures into the image store (ONL-1881).
  registerImageHandlers();
  // Before the agent host: a seam holding `undefined` drops the measurement silently (ONL-2173).
  const gitStatus = registerGitStatusHost({
    emit: (change) => broadcastToRenderers(IPC_EMIT.gitStatusChanged, change),
    onApplied: (worktreePath, row) => gitStatusCadence()?.applied(worktreePath, row),
  });
  registerGitStatusCadence({ check: (worktreePath, opts) => gitStatus.check(worktreePath, opts) });
  // Two sources: the window events stop once the app is views in a `BaseWindow`, and the app-level pair is macOS-only (ONL-2206, ONL-2222).
  app.on('browser-window-focus', (_event, window) => {
    if (!isAuxiliaryWindow(window)) gitStatusCadence()?.focused();
  });
  app.on('browser-window-blur', (_event, window) => {
    if (!isAuxiliaryWindow(window)) gitStatusCadence()?.blurred();
  });
  app.on('did-become-active', () => gitStatusCadence()?.focused());
  app.on('did-resign-active', () => gitStatusCadence()?.blurred());
  const agentHost = registerAgentHost({ isDev: is.dev, onClaudeUnauthenticated: recheckClaudeAfterUnauthenticated });
  // Probed at boot, not at the renderer's first ask, or the agents screen shows not-connected and flips (ONL-1948). The Claude pre-check follows because both spawn the same binary and the probe's grace aborts a cold extract (ONL-2186).
  void agentHost
    .probe()
    .catch(() => undefined)
    .then(() => startClaudeBootPreCheck());
  installFramePolicies();
  registerFrameHandlers();
  // Before the menu, which reads its state synchronously; the other order leaves Check for Updates enabled and doing nothing.
  initAutoUpdater();
  // Before the window: replacing Electron's stock menu is what restores ⌘C/⌘V (`menu/index.ts`).
  installApplicationMenu();
  if (instrumentHash() !== undefined) createWindow();
  else createTabbedWindow();
  // After the window: a marked bucket is never in the registry, so nothing can open it first (ONL-2152, ONL-2177).
  setImmediate(() => {
    const swept = sweepBlankBuckets();
    if (swept.length > 0) bootLog.warn('swept unfinished project buckets', { count: swept.length });
  });

  app.on('activate', () => {
    const host = tabHost();
    if (host !== undefined) {
      if (host.window.isMinimized()) host.window.restore();
      host.window.show();
      host.window.focus();
      host.activeContents()?.focus();
      return;
    }
    if (everyRenderer().length > 0) return;
    if (instrumentHash() !== undefined) createWindow();
    else createTabbedWindow();
  });
});

// Subscribing at all is what keeps the app alive with no windows open; an unsubscribed `window-all-closed` quits.
app.on('window-all-closed', () => {
  if (!isMac()) app.quit();
});

autoUpdater.on('before-quit-for-update', () => tabHost()?.beginQuit());

// `before-quit`, not `will-quit`: a held `canUseTool` promise wedges the SDK session permanently and needs the async close to settle it.
const quitTeardown = createQuitTeardown({
  // Cadence before the hosts: a timer firing mid-teardown measures against hosts being torn down.
  // The marker clears here, not in the drain chain: the chain sits behind the cap, and a marker left behind is a false crash next launch.
  // `flushAllDomains` here catches the debounced last window move; the chain's flush can be starved by the cap.
  // The spare goes first and is never waited on: it holds no session, so quit must not pay for it (ONL-2318, ONL-2254).
  synchronous: [beginTelemetryQuit, beginTurnSeenQuit, () => checkSetupAbandoned(), beginProjectSetupQuit, () => tabHost()?.beginQuit(), () => gitStatusCadence()?.dispose(), () => { const ids = correlation(); if (ids !== undefined) clearRunningMarker(ids.launchId); }, flushAllDomains, disposeServerBook, disposeStarter, () => providerIdentity.dispose(), cancelClaudeLoginForQuit],
  // Canvas first: behind the agent host's close the cap starves it (ONL-1993). Telemetry after the agent host, whose close queues each session's final capture.
  // The second domain flush writes rows sessions push while closing (ONL-2254).
  // Setup's own stop goes behind every write that can lose work and ahead of the domain flush it feeds: `beginProjectSetupQuit` already killed its handles, so what is left is a per-handle port probe that outlasts this cap (ONL-2499).
  drainChain: [flushCanvas, () => Promise.all([disposeOnlook(), disposeAgentHost()]), flushTranscripts, disposeProjectSetup, async () => flushAllDomains(), () => Promise.all([shutdownTelemetry(), flushLog()])],
  capMs: 800,
  onDone: () => {
    void shutdownTranscripts().catch((error: unknown) => {
      log('transcripts').error('transcript quit drain failed', {
        error: error instanceof Error ? error.message : 'transcript shutdown failed',
        pendingProjects: transcriptPersistenceStatus().pendingProjects,
      });
    }).finally(() => app.quit());
  },
});

app.on('before-quit', (event) => {
  // The re-entrant `app.quit()` from `onDone` must not be held again.
  if (quitTeardown.hasRun) return;
  event.preventDefault();
  if (anyUnsavedCode()) {
    const chosen = dialog.showMessageBoxSync({
      title: t('app.name'),
      type: 'question',
      message: t('quit.unsaved.message'),
      detail: t('quit.unsaved.detail'),
      buttons: [t('quit.unsaved.quit'), t('quit.unsaved.stay')],
      defaultId: 1,
      cancelId: 1,
    });
    if (chosen !== 0) return;
  }
  quitTeardown.run();
});

import { basename, join } from 'node:path';
import electron from 'electron';
import { handle } from '../ipc/bridge.js';
import {
  ARTIFACT_SCHEME,
  ARTIFACTS_PARTITION,
  IPC_INVOKE,
  type CanvasDocId,
  type PickFolderRequest,
  type PickFolderResult,
  type FrameIdleRequest,
  type FrameIdleResult,
} from '@studio/events';
import { artifactsSession } from '../artifacts/session.js';
import { markProjectDirty, noteFrameGuestLoaded } from '../canvas/index.js';
import { frameMirror } from '../canvas/mirror.js';
import { ownerOf } from '../window/host.js';
import { FRAMES_PARTITION, framesSession, installFrameSessionPolicies } from './partition.js';
import { activityFor, checkFrameProcessSharing } from './activity.js';
import { calmOutsidePages } from './motion.js';
import { checkPageProcessSharing } from '../canvas/lifecycle.js';
import { createArtifactSnapshotter } from '../artifacts/canvas-snapshot.js';
import { frameBindings } from './bindings.js';
import { installFrameRequestGuard } from './requests.js';
import { log } from '../log/index.js';
import { createFramePicture, forgetFramePicture, rememberFramePicture } from './picture.js';
import { beginCreation, creationStarted } from '../github-import/telemetry.js';

export function registerFrameHandlers(): void {
  const picture = createFramePicture(id => electron.webContents.fromId(id), guest => activityFor(guest).snapshot().thumbnail, framesSession);
  handle(IPC_INVOKE.framePicture, (event, request) => picture(event.sender, request));
  const snapshot = createArtifactSnapshotter((id) => electron.webContents.fromId(id), artifactsSession);
  handle(IPC_INVOKE.artifactSnapshot, (event, request) => snapshot(event.sender, request));
  handle(IPC_INVOKE.frameIdle, async (event, req: FrameIdleRequest): Promise<FrameIdleResult> => {
    if (!Number.isInteger(req?.webContentsId) || typeof req?.idle !== 'boolean' ||
      (req.moving !== undefined && typeof req.moving !== 'boolean')) return { paused: false };
    const guest = electron.webContents.fromId(req.webContentsId);
    if (!guest || guest.isDestroyed() || guest.getType() !== 'webview' || guest.hostWebContents !== event.sender) return { paused: false };
    const activity = activityFor(guest);
    try {
      return await activity.setIdle(req.idle, req.moving);
    } catch {
      return activity.snapshot();
    }
  });
  handle(
    IPC_INVOKE.pickFolder,
    async (event, req: PickFolderRequest): Promise<PickFolderResult> => {
      if (req.creationSource === 'folder') creationStarted('folder');
      const window = ownerOf(event.sender);
      const options: Electron.OpenDialogOptions = {
        title: req.title,
        buttonLabel: req.buttonLabel,
        properties: ['openDirectory', 'createDirectory'],
      };

      const result = window
        ? await electron.dialog.showOpenDialog(window, options)
        : await electron.dialog.showOpenDialog(options);

      const [path] = result.filePaths;
      if (result.canceled || !path) return { canceled: true };
      if (req.creationSource === 'folder') beginCreation(path, 'folder', false);
      return { canceled: false, folder: { path, name: basename(path) } };
    },
  );
}

// A sandboxed preload cannot be ESM; the guest preload is built as CommonJS.
const guestPreload = (): string => join(import.meta.dirname, '../preload/guest.cjs');

/** Positive recognition only: `src` is renderer-controlled and can attach empty, so a negation would bridge it (ONL-2568). */
export function isDevFrameSrc(src: string | undefined): boolean {
  if (src === undefined || src === '') return false;
  if (src === 'about:blank') return true;
  try {
    const { protocol } = new URL(src);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function applyGuestPolicies(
  webPreferences: Electron.WebPreferences,
  params: Record<string, string>,
): void {
  const devFrame = isDevFrameSrc(params['src']);

  // The element's attributes are renderer-controlled; main overwrites them and never honors a renderer preload (ONL-1779).
  webPreferences.nodeIntegration = false;
  webPreferences.nodeIntegrationInSubFrames = false;
  webPreferences.contextIsolation = true;
  webPreferences.sandbox = true;
  // Chromium's auto-focus on guest navigation activates the whole app on macOS mid-keystroke (ONL-1992).
  webPreferences.focusOnNavigation = false;
  // Nothing nests a guest inside a guest.
  webPreferences.webviewTag = false;
  webPreferences.webSecurity = true;
  delete webPreferences.enableBlinkFeatures;

  // On `webPreferences`, never `params`: the guest's session comes from the object Electron spreads into `webContents.create`, and the thumbnail protocol is contained by that split (ONL-2471).
  if (devFrame) {
    webPreferences.preload = guestPreload();
    webPreferences.partition = FRAMES_PARTITION;
  } else {
    // The bridge is the element picker and the evidence rail: a page that keeps it can forge
    // element evidence into the agent's prompt (ONL-2568).
    delete webPreferences.preload;
    webPreferences.partition = ARTIFACTS_PARTITION;
  }

  params['allowpopups'] = 'false';
}

export interface GuestWatchDeps {
  docIdForGuest(webContentsId: number): CanvasDocId | undefined;
  frameForGuest(webContentsId: number): { docId: CanvasDocId; frameId: string } | undefined;
  markDirty(docId: CanvasDocId): void;
  loaded(docId: CanvasDocId, frameId: string): void;
}

export function watchGuest(contents: Electron.WebContents, deps: GuestWatchDeps): void {
  activityFor(contents);
  // Chromium persists page zoom per origin per partition; a stray ⌘= put the picker's pointer maths off by that factor (ONL-1989).
  const pin = (): void => {
    if (!contents.isDestroyed()) contents.setZoomFactor(1);
  };
  pin();
  contents.on('did-navigate', pin);
  contents.on('did-navigate-in-page', pin);
  contents.on('zoom-changed', pin);

  // A reload is a main frame navigation, so `did-navigate` carries it; the line after covers the same-document navigations it excludes (ONL-2471).
  const redrawn = (): void => {
    const docId = deps.docIdForGuest(contents.id);
    if (docId !== undefined) deps.markDirty(docId);
  };
  contents.on('did-navigate', redrawn);
  contents.on('did-navigate-in-page', redrawn);
  contents.on('did-finish-load', () => {
    const frame = deps.frameForGuest(contents.id);
    if (frame !== undefined) deps.loaded(frame.docId, frame.frameId);
  });

  // Its picture for a later wake, taken while the Tab is still composited (ONL-2987).
  contents.on('did-stop-loading', () => { rememberFramePicture(contents); });
  contents.on('did-start-navigation', details => { if (details.isMainFrame) forgetFramePicture(contents); });

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // `will-attach-webview` fires once, so navigation is confined after attach too.
  confineNavigation(contents, (url) => (url.startsWith('http://') || url.startsWith('https://')) && frameBindings.allowsNavigation(contents, url), {
    subframes: false,
  });
}

/** `subframes: false` for a dev Frame: the user's app frames `blob:`, `data:` and `about:srcdoc` for previews, and this gate predates none of it (ONL-2568). */
function confineNavigation(
  contents: Electron.WebContents,
  admit: (url: string) => boolean,
  options: { subframes: boolean },
): void {
  const gate = (event: { preventDefault: () => void }, url: string, isMainFrame: boolean): void => {
    if (!admit(url) && !(isMainFrame && frameBindings.birthNavigation(contents, url))) event.preventDefault();
  };
  contents.on('will-navigate', (event, url) => {
    gate(event, url, true);
  });
  contents.on('will-frame-navigate', (event) => {
    if (!options.subframes && !event.isMainFrame) return;
    gate(event, event.url, event.isMainFrame);
  });
  contents.on('will-redirect', (event, url, _inPlace, isMainFrame) => {
    if (!options.subframes && !isMainFrame) return;
    gate(event, url, isMainFrame);
  });
}

/** Forked from `watchGuest`, which hands an http(s) URL to `shell.openExternal` before denying (ONL-2568). */
export function watchArtifactGuest(
  contents: Electron.WebContents,
  loads?: Pick<GuestWatchDeps, 'frameForGuest' | 'loaded'>,
): void {
  const pin = (): void => {
    if (!contents.isDestroyed()) contents.setZoomFactor(1);
  };
  pin();
  contents.on('did-navigate', pin);
  contents.on('zoom-changed', pin);
  if (loads !== undefined) {
    contents.on('did-finish-load', () => {
      const frame = loads.frameForGuest(contents.id);
      if (frame !== undefined) loads.loaded(frame.docId, frame.frameId);
    });
  }

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('did-create-window', (window) => {
    window.destroy();
  });

  // The CSP's `webrtc 'block'` does not stop ICE; this does (ONL-2568).
  contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');

  // Subframes included here: an artifact's own iframes stay on the scheme, which its CSP already requires.
  confineNavigation(contents, (url) => url.startsWith(`${ARTIFACT_SCHEME}://`), {
    subframes: true,
  });
}

/** Paused frame guests and paused tab shells both stall whoever joins their renderer (ONL-2894). */
function checkProcessSharing(): void {
  checkFrameProcessSharing();
  checkPageProcessSharing();
}

export function installFramePolicies(): void {
  const loadBoundFrame = (guest: Electron.WebContents, url: string | undefined): void => {
    if (url === undefined) return;
    queueMicrotask(() => {
      if (frameBindings.activate(guest, url)) void guest.loadURL(url).catch(error => {
        frameBindings.failed(guest);
        log('frames').warn('bound frame could not load', { error });
      });
    });
  };
  installFrameSessionPolicies(framesSession());
  installFrameRequestGuard(framesSession(), id => electron.webContents.fromId(id), (guest, url) => frameBindings.allowsNavigation(guest, url));
  electron.app.on('web-contents-created', (_event, contents) => {
    contents.on('frame-created', checkProcessSharing);
    contents.on('did-frame-navigate', checkProcessSharing);
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      if (!frameBindings.prepare(contents, webPreferences, params, applyGuestPolicies)) event.preventDefault();
    });
    contents.on('did-attach-webview', (_event, guest) => { loadBoundFrame(guest, frameBindings.attached(contents, guest)); });
    contents.once('destroyed', () => { frameBindings.forget(contents); frameBindings.destroyed(contents); });

    if (contents.getType() !== 'webview') return;
    frameBindings.created(contents);
    contents.on('did-start-navigation', (_event, url, _inPlace, isMainFrame) => { if (isMainFrame) frameBindings.navigating(contents, url); });
    contents.on('did-finish-load', () => { loadBoundFrame(contents, frameBindings.loaded(contents, contents.getURL())); });
    contents.on('did-navigate', () => { frameBindings.navigated(contents, contents.getURL()); });
    contents.on('did-navigate-in-page', () => { frameBindings.navigated(contents, contents.getURL()); });

    // Read off the live guest, not the params object a renderer can write.
    if (contents.session === artifactsSession()) {
      watchArtifactGuest(contents, {
        frameForGuest: (webContentsId) => frameMirror().frameForGuest(webContentsId),
        loaded: noteFrameGuestLoaded,
      });
      return;
    }

    calmOutsidePages(contents);
    watchGuest(contents, {
      docIdForGuest: (webContentsId) => frameMirror().docIdForGuest(webContentsId),
      frameForGuest: (webContentsId) => frameMirror().frameForGuest(webContentsId),
      markDirty: markProjectDirty,
      loaded: noteFrameGuestLoaded,
    });
  });
}

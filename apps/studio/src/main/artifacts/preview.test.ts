import { expect, it } from 'bun:test';
import { artifactPreviewPreferences, artifactPreviewPageAvailable, withArtifactRenderDeadline } from './preview.js';
import { imageCaptureFailure } from '../canvas/image-export.js';
import { t } from '@studio/i18n';
import { artifactsSession } from './session.js';
import { watchArtifactGuest } from '../frames/index.js';

it('reports stalled Artifact load or readiness as a render timeout, without reaching the save step', async () => {
  let wrote = false;
  let reason = '';
  try {
    await withArtifactRenderDeadline(new Promise<never>(() => {}), 5);
    wrote = true;
  } catch (error) { reason = imageCaptureFailure(error, 'wrong failure'); }
  expect(reason).toBe(t('canvas.export.timeout'));
  expect(wrote).toBe(false);
  expect(await withArtifactRenderDeadline(Promise.resolve('rendered'), 100)).toBe('rendered');
});

it('uses the dedicated sandboxed session without a preload, Node, nested guests or disabled web security', () => {
  const preferences = artifactPreviewPreferences();
  expect(preferences.session).toBe(artifactsSession());
  expect(preferences.preload).toBeUndefined();
  expect(preferences).toMatchObject({ sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInSubFrames: false, webSecurity: true, webviewTag: false, offscreen: { deviceScaleFactor: 1 } });
  expect(artifactPreviewPreferences(2).offscreen).toEqual({ deviceScaleFactor: 2 });
});

it('rejects a missing or containment-refused page before constructing capture contents, but permits an empty owned page', async () => {
  const request = { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', pagePath: 'pages/index.html', updatedAt: 'one' };
  expect(await artifactPreviewPageAvailable({ readPage: async () => null }, request)).toBe(false);
  expect(await artifactPreviewPageAvailable({ readPage: async () => '' }, request)).toBe(true);
});

it('reuses popup, navigation and WebRTC confinement for preview contents', () => {
  let popup!: () => { action: string };
  let rtc = '';
  const events = new Map<string, (...args: never[]) => void>();
  watchArtifactGuest({
    isDestroyed: () => false,
    setZoomFactor: () => {},
    setWindowOpenHandler: (handler: typeof popup) => { popup = handler; },
    setWebRTCIPHandlingPolicy: (policy: string) => { rtc = policy; },
    on: (name: string, listener: (...args: never[]) => void) => { events.set(name, listener); },
  } as unknown as Electron.WebContents);
  expect(popup()).toEqual({ action: 'deny' });
  expect(rtc).toBe('disable_non_proxied_udp');
  expect(events.has('will-navigate')).toBe(true);
  expect(events.has('will-frame-navigate')).toBe(true);
});

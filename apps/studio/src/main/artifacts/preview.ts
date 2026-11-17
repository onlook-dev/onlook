import { BrowserWindow } from 'electron';
import { artifactPageUrl, type ArtifactPreviewRequest } from '@studio/events';
import { artifactsSession } from './session.js';
import { watchArtifactGuest } from '../frames/index.js';
import { artifactStore } from './instance.js';
import type { ArtifactStore } from './adapter.js';
import { artifactRenderQueue } from './render-queue.js';
import { ImageCaptureError } from '../canvas/image-export.js';

export const ARTIFACT_PREVIEW_SIZE = { width: 1000, height: 625 };

export async function withArtifactRenderDeadline<Result>(render: Promise<Result>, timeoutMs: number): Promise<Result> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      render,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new ImageCaptureError('timeout')), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

export async function artifactPreviewPageAvailable(store: Pick<ArtifactStore, 'readPage'>, request: ArtifactPreviewRequest): Promise<boolean> {
  return await store.readPage(request.artifactId, request.pagePath) !== null;
}

export function artifactPreviewPreferences(scale: 1 | 2 = 1): Electron.WebPreferences {
  return {
    session: artifactsSession(),
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    webviewTag: false,
    backgroundThrottling: false,
    offscreen: { deviceScaleFactor: scale },
  };
}

export async function withArtifactPageContents<Result>(request: ArtifactPreviewRequest, render: (contents: Electron.WebContents) => Promise<Result>, timeoutMs = 8_000, scale: 1 | 2 = 1): Promise<Result> {
  if (!await artifactPreviewPageAvailable(artifactStore(), request)) throw new Error('preview page unavailable');
  const window = new BrowserWindow({
    ...ARTIFACT_PREVIEW_SIZE,
    useContentSize: true,
    show: false,
    webPreferences: artifactPreviewPreferences(scale),
  });
  const contents = window.webContents;
  watchArtifactGuest(contents);
  const url = new URL(artifactPageUrl(request.artifactId, request.pagePath)).href;
  contents.on('will-navigate', (event, destination) => { if (destination !== url) event.preventDefault(); });
  contents.on('will-redirect', (event, destination) => { if (destination !== url) event.preventDefault(); });
  contents.on('will-frame-navigate', (event) => { if (event.isMainFrame && event.url !== url) event.preventDefault(); });
  try {
    return await withArtifactRenderDeadline(
      (async () => {
        await contents.loadURL(url);
        await contents.executeJavaScript(`Promise.all([
          document.fonts.ready,
          ...Array.from(document.images, image => image.complete ? Promise.resolve() : new Promise(resolve => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          }))
        ]).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))`);
        const result = await render(contents);
        if (contents.getURL() !== url) throw new Error('preview navigation changed');
        return result;
      })(), timeoutMs,
    );
  } finally {
    if (!window.isDestroyed()) window.destroy();
  }
}

export function captureArtifactPreview(request: ArtifactPreviewRequest, wanted: () => boolean = () => true): Promise<string> {
  return artifactRenderQueue.run(wanted, () => withArtifactPageContents(request, async (contents) => {
    const image = await contents.capturePage(undefined, { stayHidden: true, stayAwake: true });
    if (image.isEmpty()) throw new Error('empty preview');
    return image.resize(ARTIFACT_PREVIEW_SIZE).toDataURL();
  }));
}

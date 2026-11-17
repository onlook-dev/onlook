import { readFileSync } from 'node:fs';
import { BrowserWindow, type NativeImage } from 'electron';
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?asset';
import { artifactRenderQueue } from '../../artifacts/render-queue.js';
import { thumbnailTextAtlas, withThumbnailTextPage, type ThumbnailTextPlacement } from './text.js';

export function renderThumbnailText(placements: readonly ThumbnailTextPlacement[], deadlineMs: number, wanted: () => boolean): Promise<ReadonlyMap<string, NativeImage>> {
  return artifactRenderQueue.run(() => wanted() && Date.now() < deadlineMs, () => captureText(placements, deadlineMs));
}

function captureText(placements: readonly ThumbnailTextPlacement[], deadlineMs: number): Promise<ReadonlyMap<string, NativeImage>> {
  const atlas = thumbnailTextAtlas(placements, readFileSync(interFont).toString('base64'));
  if (atlas.slots.size === 0 || Date.now() >= deadlineMs) return Promise.resolve(new Map());
  return withThumbnailTextPage(() => {
    const window = new BrowserWindow({
      width: atlas.width,
      height: atlas.height,
      useContentSize: true,
      show: false,
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        partition: 'studio-preview-text', sandbox: true, contextIsolation: true,
        nodeIntegration: false, webviewTag: false, webSecurity: true,
        backgroundThrottling: false, offscreen: { deviceScaleFactor: 1 },
      },
    });
    const contents = window.webContents;
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event) => event.preventDefault());
    return {
      destroy: () => { if (!window.isDestroyed()) window.destroy(); },
      render: async (active) => {
        await contents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(atlas.html)}`);
        if (!active()) throw new Error('text preview expired');
        await contents.executeJavaScript('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
        if (!active()) throw new Error('text preview expired');
        const image = await contents.capturePage(undefined, { stayHidden: true, stayAwake: true });
        if (!active() || image.isEmpty()) throw new Error('empty text preview');
        const size = image.getSize();
        if (size.width !== atlas.width || size.height !== atlas.height) throw new Error('incomplete text preview');
        const images = new Map<string, NativeImage>();
        for (const [id, rect] of atlas.slots) images.set(id, image.crop(rect));
        return images;
      },
    };
  }, deadlineMs - Date.now());
}

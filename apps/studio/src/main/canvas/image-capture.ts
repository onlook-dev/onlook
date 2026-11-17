import electron, { type WebContents } from 'electron';
import type { ImageExportFormat } from '@studio/events';
import { withFrameAwake } from '../frames/activity.js';
import { ImageCaptureError, MAX_EXPORT_BYTES, MAX_EXPORT_PIXELS } from './image-export.js';

export async function captureExportImage(guest: WebContents, width: number, height: number, format: ImageExportFormat): Promise<Uint8Array> {
  const bytes = await withFrameAwake(guest, () => captureImagePixels(guest, width, height, format === 'jpeg' ? 'png' : format, {
    readSize: data => electron.nativeImage.createFromBuffer(data).getSize(),
    resize: (data, pixelWidth, pixelHeight) => electron.nativeImage.createFromBuffer(data).resize({ width: pixelWidth, height: pixelHeight, quality: 'best' }).toPNG(),
  }));
  if (format !== 'jpeg') return bytes;
  const image = electron.nativeImage.createFromBuffer(Buffer.from(bytes));
  const size = image.getSize();
  const pixels = image.toBitmap();
  if (pixels.length !== size.width * size.height * 4) throw new Error('incorrect export bitmap dimensions');
  flattenOnWhite(pixels);
  return electron.nativeImage.createFromBitmap(pixels, { ...size, scaleFactor: 1 }).toJPEG(95);
}

export function flattenOnWhite(pixels: Buffer): void {
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const white = 255 - pixels[offset + 3]!;
    for (let channel = 0; channel < 3; channel += 1) pixels[offset + channel] = Math.min(255, pixels[offset + channel]! + white);
    pixels[offset + 3] = 255;
  }
}

export async function captureImagePixels(guest: Pick<WebContents, 'isDestroyed' | 'capturePage' | 'executeJavaScriptInIsolatedWorld'>, width: number, height: number, format: Exclude<ImageExportFormat, 'jpeg'>, codec: {
  readSize(bytes: Buffer): { width: number; height: number };
  resize(bytes: Buffer, width: number, height: number): Buffer;
}, timeoutMs = 10_000): Promise<Uint8Array> {
    const scale = format === 'png-2x' ? 2 : 1;
    if (![width, height].every(value => Number.isFinite(value) && value > 0 && value <= 16384) || width * height * scale * scale > MAX_EXPORT_PIXELS) throw new ImageCaptureError('too-large');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const current = (): void => { if (!active || guest.isDestroyed()) throw new ImageCaptureError('unavailable'); };
    try {
      return await Promise.race([
        (async () => {
          await guest.capturePage({ x: 0, y: 0, width: 1, height: 1 }, { stayHidden: true, stayAwake: true });
          current();
          const viewport = await guest.executeJavaScriptInIsolatedWorld(999, [{ code: 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({ width: innerWidth, height: innerHeight }))))' }]);
          current();
          if (!viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || Math.abs(viewport.width - width) > 1 || Math.abs(viewport.height - height) > 1) throw new ImageCaptureError('unavailable');
          const image = await guest.capturePage(undefined, { stayHidden: true, stayAwake: true });
          current();
          const nativeScale = Math.max(...image.getScaleFactors());
          if (!Number.isFinite(nativeScale) || nativeScale <= 0) throw new ImageCaptureError('resolution');
          if (width * height * nativeScale * nativeScale > MAX_EXPORT_PIXELS) throw new ImageCaptureError('too-large');
          const bytes = image.toPNG({ scaleFactor: nativeScale });
          if (bytes.byteLength === 0 || bytes.byteLength > MAX_EXPORT_BYTES) throw new ImageCaptureError('too-large');
          const size = codec.readSize(bytes);
          const pixelWidth = Math.round(width * scale);
          const pixelHeight = Math.round(height * scale);
          if (size.width < pixelWidth || size.height < pixelHeight) throw new ImageCaptureError('resolution');
          if (size.width * size.height > MAX_EXPORT_PIXELS) throw new ImageCaptureError('too-large');
          if (Math.abs(size.width / size.height - width / height) > 1 / Math.min(width, height)) throw new ImageCaptureError('unavailable');
          return size.width === pixelWidth && size.height === pixelHeight ? bytes : codec.resize(bytes, pixelWidth, pixelHeight);
        })(),
        new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new ImageCaptureError('timeout')), timeoutMs); }),
      ]);
    } finally {
      active = false;
      clearTimeout(timer);
    }
}

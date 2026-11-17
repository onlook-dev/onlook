import type {} from '../../apps/studio/src/renderer/src/env.js';
import { expect, it } from 'bun:test';
import type { NativeImage } from 'electron';
import { canvasPicture } from '../../apps/studio/src/main/images/canvas-picture.js';
import { createArtifactSnapshots } from '../../apps/studio/src/renderer/src/canvas/artifact/snapshots.js';

function capture(width: number, height: number): NativeImage {
  return {
    getSize: () => ({ width, height }),
    resize: (size: { width: number; height: number }) => capture(size.width, size.height),
    toDataURL: () => `data:image/png;base64,${'A'.repeat(Math.ceil((width * height * 4 + height + 1024) / 3) * 4)}`,
  } as NativeImage;
}

it('admits sharp square, wide and tall captures within the production cache budget', async () => {
  const cache = createArtifactSnapshots();
  for (const [width, height] of [[2560, 2560], [3840, 2160], [4096, 4096], [780, 3800]] as const) {
    const picture = canvasPicture(capture(width, height));
    expect(picture.width * picture.height).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(Math.max(picture.width, picture.height)).toBeLessThanOrEqual(4096);
    const key = `${width}x${height}`;
    let reads = 0;
    const read = async () => { reads += 1; return picture; };
    await cache.capture(key, () => true, read);
    expect(cache.peek(key)).toBe(picture);
    await cache.capture(key, () => true, read);
    expect(reads).toBe(1);
  }
});

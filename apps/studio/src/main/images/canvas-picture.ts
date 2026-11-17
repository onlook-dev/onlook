import type { NativeImage } from 'electron';

export function canvasPicture(image: NativeImage): { image: string; width: number; height: number } {
  const size = image.getSize();
  const scale = Math.min(1, 4096 / Math.max(size.width, size.height), Math.sqrt(4 * 1024 * 1024 / (size.width * size.height)));
  const width = Math.max(1, Math.floor(size.width * scale));
  const height = Math.max(1, Math.floor(size.height * scale));
  return { image: (scale < 1 ? image.resize({ width, height }) : image).toDataURL(), width, height };
}

import { codeImageMediaType, IMAGE_MAX_BYTES, type CodeReadRequest, type CodeReadResult } from '@studio/events';
import type { ImageIngestSource } from './ingest.js';
import { rasterBytes } from './rasterBytes.js';
import { ignoreRefusal } from '../../refusal.js';

export const PROJECT_IMAGE_DRAG_TYPE = 'application/x-onlook-project-image';

export interface ProjectImageDrag {
  path: string;
  workspacePath: string;
}

export function projectImageDrag(data: string): ProjectImageDrag | null {
  try {
    const value: unknown = JSON.parse(data);
    if (typeof value !== 'object' || value === null || !('path' in value) || !('workspacePath' in value)) return null;
    if (typeof value.path !== 'string' || typeof value.workspacePath !== 'string' || value.workspacePath === '' || codeImageMediaType(value.path) === null) return null;
    return { path: value.path, workspacePath: value.workspacePath };
  } catch {
    return null;
  }
}

/** Read only at drop, through the same scoped bridge as opening a file. */
export async function projectImageSource(path: string, read: (request: CodeReadRequest) => Promise<CodeReadResult>, onRefusal: (error: unknown) => void = ignoreRefusal('canvas', 'codeRead')): Promise<ImageIngestSource> {
  const answer = await read({ path }).catch((error: unknown) => { onRefusal(error); return undefined; });
  return {
    name: path.split('/').at(-1) ?? path,
    size: answer?.ok === true ? answer.snapshot.size : answer?.code === 'too-large' ? IMAGE_MAX_BYTES + 1 : 0,
    bytes: async () => {
      if (answer?.ok !== true || answer.image === undefined) throw new Error('Image read refused');
      const mediaType = codeImageMediaType(path);
      if (mediaType === 'image/avif' || mediaType === 'image/x-icon') return rasterBytes(answer.image.dataUrl);
      // Decode locally: the app permits data URLs as images, not fetch targets.
      const encoded = answer.image.dataUrl.split(',')[1];
      if (encoded === undefined) throw new Error('Image payload missing');
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    },
  };
}

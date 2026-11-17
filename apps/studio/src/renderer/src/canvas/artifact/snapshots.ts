import type { ArtifactSnapshot } from '@studio/events';
import { ignoreRefusal } from '../../refusal.js';

export function createArtifactSnapshots(limit = 48, byteLimit = 64 * 1024 * 1024, onRefusal = ignoreRefusal('canvas', 'artifactSnapshot')) {
  const pictures = new Map<string, ArtifactSnapshot>();
  let bytes = 0;
  let pending = 0;
  let tail = Promise.resolve();
  const cost = (picture: ArtifactSnapshot) => picture.width * picture.height * 4 + picture.image.length * 2;
  return {
    /** Unlike `peek`, leaves the eviction order alone, so a count cannot change which snapshot is dropped next (ONL-2791). */
    has(key: string): boolean { return pictures.has(key); },
    peek(key: string): ArtifactSnapshot | undefined {
      const picture = pictures.get(key);
      if (picture) { pictures.delete(key); pictures.set(key, picture); }
      return picture;
    },
    capture(key: string, wanted: () => boolean, read: () => Promise<ArtifactSnapshot | null>): Promise<void> {
      if (pictures.has(key) || pending >= limit) return Promise.resolve();
      pending += 1;
      const task = tail.then(async () => {
        if (!wanted() || pictures.has(key)) return;
        const picture = await read();
        if (!picture || !wanted() || cost(picture) > byteLimit) return;
        pictures.set(key, picture);
        bytes += cost(picture);
        while (pictures.size > limit || bytes > byteLimit) {
          const oldest = pictures.keys().next().value!;
          bytes -= cost(pictures.get(oldest)!);
          pictures.delete(oldest);
        }
      }).catch(onRefusal).finally(() => { pending -= 1; });
      tail = task;
      return task;
    },
  };
}

export const artifactSnapshots = createArtifactSnapshots();

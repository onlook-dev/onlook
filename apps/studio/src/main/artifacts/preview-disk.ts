import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, readdir, rename, unlink, lstat, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { isArtifactId, type ArtifactPreviewRequest } from '@studio/events';

const FILE_NAME = /^[a-f0-9-]{36}-[a-f0-9]{64}\.json$/;
const PREFIX = 'data:image/png;base64,';
const IMAGE_BYTES = 4 * 1024 * 1024;

export function createPreviewDisk(root: string, limits = { entries: 96, bytes: 32 * 1024 * 1024 }) {
  const directory = join(root, 'artifact-previews');
  let pending = Promise.resolve();
  let touched = 0;
  let isSwept = false;

  async function admitted(): Promise<boolean> {
    return (await lstat(directory)).isDirectory();
  }

  async function touch(path: string): Promise<void> {
    touched = Math.max(Date.now(), touched + 1);
    const time = new Date(touched);
    await utimes(path, time, time);
  }

  function serialized<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = pending.then(operation);
    pending = result.then(() => {}, () => {});
    return result;
  }

  function filename(request: ArtifactPreviewRequest): string {
    const digest = createHash('sha256').update(JSON.stringify([request.artifactId, request.pagePath, request.updatedAt])).digest('hex');
    return `${request.artifactId}-${digest}.json`;
  }

  async function trim(): Promise<void> {
    const files = await readdir(directory);
    const entries = [];
    for (const name of files) {
      if (name === 'pending.preview') { await unlink(join(directory, name)); continue; }
      if (!FILE_NAME.test(name)) continue;
      const stat = await lstat(join(directory, name));
      if (!stat.isFile()) { await unlink(join(directory, name)); continue; }
      entries.push({ name, bytes: stat.size, touched: stat.mtimeMs });
      touched = Math.max(touched, Math.ceil(stat.mtimeMs));
    }
    entries.sort((first, second) => first.touched - second.touched);
    let bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    while (entries.length > limits.entries || bytes > limits.bytes) {
      const oldest = entries.shift()!;
      await unlink(join(directory, oldest.name));
      bytes -= oldest.bytes;
    }
  }

  return {
    read(request: ArtifactPreviewRequest): Promise<string | undefined> {
      return serialized(async () => {
        const path = join(directory, filename(request));
        try {
          if (!isArtifactId(request.artifactId) || !await admitted()) return undefined;
          // Once a launch, not once a read: a page of nodes all read at the moment it is reopened,
          // and a sweep is a readdir plus an lstat per picture kept. Every write still trims (ONL-2791).
          if (!isSwept) {
            isSwept = true;
            await trim();
          }
          const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
          let data: unknown;
          try {
            const stat = await file.stat();
            if (!stat.isFile() || stat.size > IMAGE_BYTES + 256) return undefined;
            data = JSON.parse(await file.readFile('utf8'));
          } finally { await file.close(); }
          const saved = data as { image?: unknown; checksum?: unknown } | null;
          const image = saved?.image;
          if (typeof image !== 'string' || image.length > IMAGE_BYTES || !image.startsWith(PREFIX) ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(image.slice(PREFIX.length)) ||
            saved?.checksum !== createHash('sha256').update(image).digest('hex')) {
            await unlink(path);
            return undefined;
          }
          await touch(path);
          return image;
        } catch {
          try { if (isArtifactId(request.artifactId) && await admitted()) await unlink(path); } catch {}
          return undefined;
        }
      });
    },
    write(request: ArtifactPreviewRequest, image: string): Promise<void> {
      return serialized(async () => {
        try {
          if (!isArtifactId(request.artifactId) || !image.startsWith(PREFIX) || image.length > IMAGE_BYTES) return;
          await mkdir(directory, { recursive: true, mode: 0o700 });
          if (!await admitted()) return;
          await trim();
          const path = join(directory, filename(request));
          const temporary = join(directory, 'pending.preview');
          const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
          try { await file.writeFile(JSON.stringify({ image, checksum: createHash('sha256').update(image).digest('hex') })); } finally { await file.close(); }
          await rename(temporary, path);
          await touch(path);
          await trim();
        } catch {}
      });
    },
    remove(artifactId: string): Promise<void> {
      return serialized(async () => {
        try {
          if (!isArtifactId(artifactId) || !await admitted()) return;
          for (const name of await readdir(directory)) {
            if (FILE_NAME.test(name) && name.startsWith(`${artifactId}-`)) await unlink(join(directory, name));
          }
        } catch {}
      });
    },
  };
}

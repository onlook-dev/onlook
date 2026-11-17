import { expect, it } from 'bun:test';
import { mkdtemp, readdir, writeFile, symlink, stat, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ArtifactManifest, ArtifactPreviewRequest } from '@studio/events';
import { createPreviewDisk } from './preview-disk.js';
import { createArtifactPreviewService } from './preview-cache.js';

const request: ArtifactPreviewRequest = { artifactId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', pagePath: 'pages/home.html', updatedAt: 'one' };
const image = 'data:image/png;base64,cGFnZQ==';
const manifest = { id: request.artifactId, updatedAt: request.updatedAt, pages: [{ path: request.pagePath, name: 'Home' }] } as ArtifactManifest;

it('reuses disk images on a new service without capture and keeps revision and page identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artifact-preview-'));
  const store = { read: async () => ({ outcome: 'resolved' as const, manifest, readOnly: false }) };
  let captures = 0;
  const capture = async () => { captures += 1; return image; };
  const first = createArtifactPreviewService({ store, capture, disk: createPreviewDisk(root) });
  expect(await first.request(request)).toEqual({ outcome: 'ready', image });
  const restarted = createArtifactPreviewService({ store, capture, disk: createPreviewDisk(root) });
  expect(await restarted.request(request)).toEqual({ outcome: 'ready', image });
  expect(captures).toBe(1);
  const disk = createPreviewDisk(root);
  expect(await disk.read({ ...request, updatedAt: 'two' })).toBeUndefined();
  expect(await disk.read({ ...request, pagePath: 'other.html' })).toBeUndefined();
  restarted.invalidate(request.artifactId);
  expect(await restarted.request(request)).toEqual({ outcome: 'ready', image });
  expect(captures).toBe(2);
  await disk.remove(request.artifactId);
  expect(await disk.read(request)).toBeUndefined();
});

it('evicts least recently used images by count and bytes across restarts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artifact-preview-'));
  const disk = createPreviewDisk(root, { entries: 2, bytes: 1024 });
  const second = { ...request, pagePath: 'second.html' };
  await disk.write(request, image);
  await disk.write(second, image);
  await disk.read(request);
  await disk.write({ ...request, pagePath: 'third.html' }, image);
  expect(await disk.read(second)).toBeUndefined();
  expect(await disk.read(request)).toBe(image);
  const [name] = await readdir(join(root, 'artifact-previews'));
  const bytes = (await stat(join(root, 'artifact-previews', name!))).size;
  expect(await createPreviewDisk(root, { entries: 96, bytes }).read(request)).toBe(image);
  expect(await readdir(join(root, 'artifact-previews'))).toHaveLength(1);
});

it('sweeps the kept pictures once a launch, not once a read', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artifact-preview-'));
  const disk = createPreviewDisk(root);
  await disk.write(request, image);
  const directory = join(root, 'artifact-previews');
  const leftover = join(directory, 'pending.preview');

  await writeFile(leftover, 'a crashed write');
  expect(await disk.read(request)).toBe(image);
  expect(await readdir(directory)).not.toContain('pending.preview');

  // Every node on a reopening page reads at once; only the first of them may sweep.
  await writeFile(leftover, 'a crashed write');
  expect(await disk.read(request)).toBe(image);
  expect(await readdir(directory)).toContain('pending.preview');
});

it('rejects image corruption even when it is still base64 and never follows a cache directory symlink', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artifact-preview-'));
  const disk = createPreviewDisk(root);
  await disk.write(request, image);
  const [name] = await readdir(join(root, 'artifact-previews'));
  const path = join(root, 'artifact-previews', name!);
  const saved = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({ ...saved, image: 'data:image/png;base64,b3RoZXI=' }));
  expect(await disk.read(request)).toBeUndefined();
  const outside = join(root, 'outside');
  const linked = join(root, 'linked');
  await mkdir(outside);
  await mkdir(linked);
  await symlink(outside, join(linked, 'artifact-previews'));
  await createPreviewDisk(linked).write(request, image);
  expect(await readdir(outside)).toEqual([]);
});

it('treats corrupt files, symlinks and unwritable caches as misses', async () => {
  const root = await mkdtemp(join(tmpdir(), 'artifact-preview-'));
  const disk = createPreviewDisk(root);
  await disk.write(request, image);
  const [name] = await readdir(join(root, 'artifact-previews'));
  await writeFile(join(root, 'artifact-previews', name!), 'broken');
  expect(await disk.read(request)).toBeUndefined();
  await symlink(join(root, 'outside'), join(root, 'artifact-previews', name!));
  expect(await disk.read(request)).toBeUndefined();
  const fileRoot = join(root, 'not-a-directory');
  await writeFile(fileRoot, 'file');
  const broken = createPreviewDisk(fileRoot);
  await broken.write(request, image);
  expect(await broken.read(request)).toBeUndefined();
});

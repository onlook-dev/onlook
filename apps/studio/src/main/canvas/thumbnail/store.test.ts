import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { canvasDir } from '../fs-backend.js';
import { THUMBNAIL_MAX_BYTES } from './compose.js';
import {
  primeThumbnailIndex,
  removeThumbnail,
  thumbnailMtime,
  thumbnailPath,
  writeThumbnail,
} from './store.js';

/** The protocol reads the path it has already contained, so the store exposes no read of its own. */
const bytesOf = (docId: string): Buffer | null => {
  try {
    return readFileSync(thumbnailPath(docId));
  } catch {
    return null;
  }
};

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `canvas-thumb-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  primeThumbnailIndex();
  return root;
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe('thumbnail store — the write', () => {
  it('writes one file per project beside the canvas document, at 0600, and reports it present', () => {
    const root = useOwnWorkspaceRoot('write');

    const written = writeThumbnail('doc_a', PNG);

    expect(written.ok).toBe(true);
    expect(thumbnailPath('doc_a')).toBe(join(root, 'canvas', 'doc_a.thumb.png'));
    expect(statSync(thumbnailPath('doc_a')).mode & 0o777).toBe(0o600);
    expect(bytesOf('doc_a')).toEqual(PNG);
    expect(thumbnailMtime('doc_a')).toBe(statSync(thumbnailPath('doc_a')).mtimeMs);
  });

  it('leaves no temp sibling behind, so the destination is absent or complete', () => {
    useOwnWorkspaceRoot('atomic');

    writeThumbnail('doc_b', PNG);

    expect(readdirSync(canvasDir())).toEqual(['doc_b.thumb.png']);
    expect(readFileSync(thumbnailPath('doc_b'))).toEqual(PNG);
  });

  it('replaces the file on the next capture and moves its mtime forward', () => {
    useOwnWorkspaceRoot('replace');
    writeThumbnail('doc_c', PNG);
    const path = thumbnailPath('doc_c');
    const backdated = new Date(Date.now() - 5_000);
    utimesSync(path, backdated, backdated);
    primeThumbnailIndex();
    const before = thumbnailMtime('doc_c') ?? 0;

    const next = Buffer.concat([PNG, Buffer.from([9, 9])]);
    writeThumbnail('doc_c', next);

    expect(bytesOf('doc_c')).toEqual(next);
    expect(thumbnailMtime('doc_c') ?? 0).toBeGreaterThan(before);
    expect(thumbnailMtime('doc_c')).toBe(statSync(path).mtimeMs);
  });

  it('refuses a composite over the one-megabyte ceiling, leaving the file on disk byte-identical', () => {
    useOwnWorkspaceRoot('ceiling');
    writeThumbnail('doc_d', PNG);
    const before = thumbnailMtime('doc_d');

    const refused = writeThumbnail('doc_d', Buffer.alloc(THUMBNAIL_MAX_BYTES + 1));

    expect(refused).toEqual({ ok: false, reason: 'too-large' });
    expect(readFileSync(thumbnailPath('doc_d'))).toEqual(PNG);
    expect(thumbnailMtime('doc_d')).toBe(before);
    expect(existsSync(thumbnailPath('doc_never'))).toBe(false);
  });
});

describe('thumbnail store — the read answers absent', () => {
  it('answers absent for a project never photographed', () => {
    useOwnWorkspaceRoot('absent');

    expect(thumbnailMtime('doc_never')).toBeNull();
    expect(bytesOf('doc_never')).toBeNull();
  });

  // The index stays authoritative; the card heals through this not-found, not a stat per list.
  it('answers absent, not a throw, when the file went behind the app’s back', () => {
    useOwnWorkspaceRoot('vanished');
    writeThumbnail('doc_e', PNG);
    rmSync(thumbnailPath('doc_e'));

    expect(bytesOf('doc_e')).toBeNull();
    expect(thumbnailMtime('doc_e')).not.toBeNull();
  });
});

describe('thumbnail store — priming', () => {
  it('reports a thumbnail this process never wrote, with its on-disk mtime', () => {
    useOwnWorkspaceRoot('prime-existing');
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(thumbnailPath('doc_f'), PNG);
    const backdated = new Date(Date.now() - 60_000);
    utimesSync(thumbnailPath('doc_f'), backdated, backdated);

    primeThumbnailIndex();

    expect(thumbnailMtime('doc_f')).toBe(statSync(thumbnailPath('doc_f')).mtimeMs);
  });

  it('primes an empty index when the canvas directory does not exist yet', () => {
    useOwnWorkspaceRoot('prime-missing');

    expect(existsSync(canvasDir())).toBe(false);
    expect(() => primeThumbnailIndex()).not.toThrow();
    expect(thumbnailMtime('doc_g')).toBeNull();
  });

  it('ignores documents, logs and temp siblings while priming', () => {
    useOwnWorkspaceRoot('prime-siblings');
    mkdirSync(canvasDir(), { recursive: true });
    writeFileSync(join(canvasDir(), 'doc_h.json'), '{}');
    writeFileSync(join(canvasDir(), 'doc_h.log.json'), '[]');
    writeFileSync(join(canvasDir(), 'doc_h.thumb.png.4321.tmp'), PNG);

    primeThumbnailIndex();

    expect(thumbnailMtime('doc_h')).toBeNull();
  });
});

describe('thumbnail store — removal', () => {
  it('removes the file, its interrupted temp siblings and its index entry, and tolerates absence', () => {
    useOwnWorkspaceRoot('remove');
    writeThumbnail('doc_i', PNG);
    const stranded = `${thumbnailPath('doc_i')}.9876.tmp`;
    writeFileSync(stranded, PNG);

    removeThumbnail('doc_i');

    expect(existsSync(thumbnailPath('doc_i'))).toBe(false);
    expect(existsSync(stranded)).toBe(false);
    expect(thumbnailMtime('doc_i')).toBeNull();
    expect(() => removeThumbnail('doc_i')).not.toThrow();
    expect(() => removeThumbnail('doc_never')).not.toThrow();
  });
});

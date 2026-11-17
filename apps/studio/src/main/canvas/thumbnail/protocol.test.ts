import { mkdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'bun:test';
import type { CanvasDocId } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot, restoreWorkspaceRoot } from '@studio/fixtures';
import { canvasDir, canvasDocPath, canvasLogPath } from '../fs-backend.js';
import { rebindCanvasDoc, resetCanvasRegistryCache } from '../registry.js';
import {
  handleThumbnailRequest,
  installThumbnailProtocol,
  registerThumbnailScheme,
  THUMBNAIL_SCHEME,
  THUMBNAIL_SCHEME_PRIVILEGES,
  thumbnailUrl,
} from './protocol.js';
import { thumbnailPath, writeThumbnail } from './store.js';

afterAll(() => {
  restoreWorkspaceRoot();
  cleanupTempFixtures();
});

const DOC_ID: CanvasDocId = '3f2a91c4-77b8-4d1e-9a05-6c8e2b41d7fa';

const PRIVILEGES = {
  standard: true,
  secure: true,
  supportFetchAPI: false,
  corsEnabled: false,
  bypassCSP: false,
  allowServiceWorkers: false,
};

function useOwnWorkspaceRoot(name: string): string {
  const root = makeWorkspaceRoot({ name: `canvas-thumb-protocol-${name}` });
  process.env['STUDIO_WORKSPACE_ROOT'] = root;
  resetCanvasRegistryCache();
  mkdirSync(canvasDir(), { recursive: true });
  return root;
}

function knownDoc(root: string, docId: CanvasDocId = DOC_ID): CanvasDocId {
  rebindCanvasDoc(join(root, 'github-com-fixture-alpha', 'teal-skylark'), docId);
  return docId;
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/gFvaBl0AAAAAElFTkSuQmCC',
  'base64',
);

const ask = (url: string): Response => handleThumbnailRequest({ url });

describe('the thumbnail protocol — a known doc with bytes on disk, proven first', () => {
  it('answers the PNG bytes, with no-store and an image content type', async () => {
    const root = useOwnWorkspaceRoot('hit');
    knownDoc(root);
    const written = writeThumbnail(DOC_ID, PNG);
    expect(written.ok).toBe(true);

    const response = ask(thumbnailUrl(DOC_ID, written.ok ? written.mtimeMs : 0));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PNG);
  });

  it('serves the current bytes for a URL whose token no longer matches the file', async () => {
    const root = useOwnWorkspaceRoot('stale-token');
    knownDoc(root);
    writeThumbnail(DOC_ID, PNG);
    const next = Buffer.concat([PNG, PNG]);
    writeFileSync(thumbnailPath(DOC_ID), next);

    const response = ask(thumbnailUrl(DOC_ID, 1));

    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(next);
  });

  it('ignores whatever else the query carries', () => {
    const root = useOwnWorkspaceRoot('extra-query');
    knownDoc(root);
    writeThumbnail(DOC_ID, PNG);

    expect(ask(`${thumbnailUrl(DOC_ID, 7)}&other=1`).status).toBe(200);
  });
});

describe('the thumbnail protocol — a reference with no file behind it', () => {
  it('answers not-found rather than an error, so the card falls into its placeholder', async () => {
    const root = useOwnWorkspaceRoot('missing');
    knownDoc(root);

    const response = ask(thumbnailUrl(DOC_ID, 1));

    expect(response.status).toBe(404);
    expect((await response.arrayBuffer()).byteLength).toBe(0);
  });

  it('answers not-found when the canvas directory itself is gone', () => {
    const root = useOwnWorkspaceRoot('no-dir');
    knownDoc(root);
    rmSync(canvasDir(), { recursive: true, force: true });

    expect(ask(thumbnailUrl(DOC_ID, 1)).status).toBe(404);
  });
});

describe('the thumbnail protocol — what it refuses', () => {
  it('refuses a doc id the canvas registry does not know, bytes on disk or not', () => {
    useOwnWorkspaceRoot('unknown-doc');
    writeThumbnail(DOC_ID, PNG);

    expect(ask(thumbnailUrl(DOC_ID, 1)).status).toBe(403);
  });

  it('refuses a foreign host, and an empty one', () => {
    const root = useOwnWorkspaceRoot('foreign-host');
    knownDoc(root);
    writeThumbnail(DOC_ID, PNG);

    expect(ask(`${THUMBNAIL_SCHEME}://elsewhere/${DOC_ID}`).status).toBe(403);
    expect(ask(`${THUMBNAIL_SCHEME}://${DOC_ID}/${DOC_ID}`).status).toBe(403);
    expect(ask(`${THUMBNAIL_SCHEME}:///${DOC_ID}`).status).toBe(403);
  });

  it('refuses a request for the canvas document or its log beside the thumbnail', () => {
    const root = useOwnWorkspaceRoot('document');
    const docId = knownDoc(root);
    writeThumbnail(docId, PNG);
    writeFileSync(canvasDocPath(docId), '{"frames":[{"url":"http://localhost:3000"}]}');
    writeFileSync(canvasLogPath(docId), '[]');

    expect(ask(`${THUMBNAIL_SCHEME}://canvas/${docId}.json`).status).toBe(403);
    expect(ask(`${THUMBNAIL_SCHEME}://canvas/${docId}.log.json`).status).toBe(403);
    expect(ask(`${THUMBNAIL_SCHEME}://canvas/${docId}.thumb.png`).status).toBe(403);
  });

  // The thumbnail for DOC_ID is on disk and contained, and every id below is in the
  // registry, so 403 rather than 200 or 404 is what places the shape gate before the join.
  it('refuses a shaped-wrong doc id before any path is composed', () => {
    const root = useOwnWorkspaceRoot('shape');
    writeThumbnail(DOC_ID, PNG);
    const refused = [
      '..%2F..%2Fcanvas-registry',
      '%2e%2e%2fcanvas-registry',
      '%252e%252e%252fcanvas-registry',
      '..\\..\\canvas-registry',
      `${DOC_ID}%00.png`,
      `${DOC_ID}%00`,
      DOC_ID.toUpperCase(),
      `/${DOC_ID}`,
      `${root}/canvas/${DOC_ID}`,
      '3f2a91c4-77b8-4d1e-9a05-6c8e2b41d7f',
      '3f2a91c4-77b8-4d1e-9a05-6c8e2b41d7fab',
      '3f2a91c4_77b8_4d1e_9a05_6c8e2b41d7fa',
      'canvas-registry',
      '',
    ];

    for (const raw of refused) {
      rebindCanvasDoc(join(root, 'planted', raw), raw);
      expect(ask(`${THUMBNAIL_SCHEME}://canvas/${raw}`).status).toBe(403);
    }
  });

  it('refuses a symlink planted at a registry-known thumbnail path rather than following it', () => {
    const root = useOwnWorkspaceRoot('symlink');
    knownDoc(root);
    const outside = join(root, 'secret.png');
    writeFileSync(outside, PNG);
    rmSync(thumbnailPath(DOC_ID), { force: true });
    symlinkSync(outside, thumbnailPath(DOC_ID));
    expect(statSync(thumbnailPath(DOC_ID)).size).toBe(PNG.byteLength);

    expect(ask(thumbnailUrl(DOC_ID, 1)).status).toBe(403);
  });

  it('refuses a symlink to a sibling inside the canvas directory', () => {
    const root = useOwnWorkspaceRoot('symlink-inside');
    knownDoc(root);
    const inside = join(canvasDir(), 'held.png');
    writeFileSync(inside, PNG);
    rmSync(thumbnailPath(DOC_ID), { force: true });
    symlinkSync(inside, thumbnailPath(DOC_ID));

    // Containment alone would serve this; the path must be this document's own thumbnail.
    expect(ask(thumbnailUrl(DOC_ID, 1)).status).toBe(403);
  });

  it('refuses a symlink aimed at another document’s thumbnail, so one card cannot show another’s canvas', () => {
    const root = useOwnWorkspaceRoot('symlink-sibling-doc');
    knownDoc(root);
    const other = '3f2a91c4-77b8-4d1e-9a05-6c8e2b41d7fb';
    writeFileSync(join(canvasDir(), `${other}.thumb.png`), PNG);
    rmSync(thumbnailPath(DOC_ID), { force: true });
    symlinkSync(join(canvasDir(), `${other}.thumb.png`), thumbnailPath(DOC_ID));

    expect(ask(thumbnailUrl(DOC_ID, 1)).status).toBe(403);
  });

  it('refuses a symlink aimed at the canvas document, which names every frame’s url', () => {
    const root = useOwnWorkspaceRoot('symlink-canvas-doc');
    knownDoc(root);
    writeFileSync(canvasDocPath(DOC_ID), '{"frames":[]}');
    rmSync(thumbnailPath(DOC_ID), { force: true });
    symlinkSync(canvasDocPath(DOC_ID), thumbnailPath(DOC_ID));

    expect(ask(thumbnailUrl(DOC_ID, 1)).status).toBe(403);
  });
});

describe('the thumbnail protocol — its registration', () => {
  it('pins the scheme flags whole: standard and secure on, every fetch-shaped flag off', () => {
    const captured: unknown[] = [];
    registerThumbnailScheme((schemes) => captured.push(...schemes));

    expect(captured).toEqual([{ scheme: 'studio-thumb', privileges: PRIVILEGES }]);
    expect(THUMBNAIL_SCHEME).toBe('studio-thumb');
    expect(THUMBNAIL_SCHEME_PRIVILEGES).toEqual(PRIVILEGES);
  });

  // A guest lives in another session, and a session with no handler for the scheme
  // has nothing to refuse — the handler goes on one protocol target and no other.
  it('installs the handler on exactly one protocol target, under the pinned scheme', () => {
    const installed: string[] = [];
    installThumbnailProtocol({
      handle: (scheme) => {
        installed.push(scheme);
      },
    });

    expect(installed).toEqual(['studio-thumb']);
  });

  it('composes a URL carrying the scheme, the host, the doc id and the token', () => {
    expect(thumbnailUrl(DOC_ID, 1726412345678)).toBe(
      `studio-thumb://canvas/${DOC_ID}?v=1726412345678`,
    );
  });
});

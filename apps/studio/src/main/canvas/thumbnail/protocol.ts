import { readFileSync, realpathSync } from 'node:fs';
import { basename, join, sep } from 'node:path';
import type { CanvasDocId } from '@studio/events';
import { canvasDir } from '../dir.js';
import { worktreeForCanvasDoc } from '../registry.js';
import { thumbnailPath } from './store.js';

export const THUMBNAIL_SCHEME = 'studio-thumb';

const HOST = 'canvas';

export const THUMBNAIL_SCHEME_PRIVILEGES: Electron.Privileges = {
  standard: true,
  secure: true,
  supportFetchAPI: false,
  corsEnabled: false,
  bypassCSP: false,
  allowServiceWorkers: false,
};

/** The token versions the image; it does not authorise. Truncated because a stat's milliseconds carry a fraction (ONL-2471). */
export function thumbnailUrl(docId: CanvasDocId, mtimeMs: number): string {
  return `${THUMBNAIL_SCHEME}://${HOST}/${docId}?v=${String(Math.trunc(mtimeMs))}`;
}

// Gates renderer-supplied text out of the path join.
const ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const refused = (): Response => new Response(null, { status: 403 });

// Not an error: the card's `<img>` then falls into its placeholder with no renderer branch.
const notFound = (): Response => new Response(null, { status: 404 });

function docIdFrom(url: string): CanvasDocId | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.host !== HOST) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    return null;
  }
  return ID_SHAPE.test(decoded) ? decoded : null;
}

export function handleThumbnailRequest(request: { url: string }): Response {
  const docId = docIdFrom(request.url);
  if (docId === null) return refused();
  if (worktreeForCanvasDoc(docId) === undefined) return refused();

  let dir: string;
  let real: string;
  let expected: string;
  try {
    dir = realpathSync(canvasDir());
    real = realpathSync(thumbnailPath(docId));
    expected = join(dir, basename(thumbnailPath(docId)));
  } catch {
    return notFound();
  }
  // The shape gate does not cover a planted symlink at a registry-known name.
  if (!real.startsWith(dir + sep)) return refused();
  // A symlink to a sibling's thumbnail or to the canvas document still resolves inside the directory (ONL-2471).
  if (real !== expected) return refused();

  let bytes: Buffer;
  try {
    bytes = readFileSync(real);
  } catch {
    return notFound();
  }
  return new Response(bytes, {
    headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
  });
}

/** Process-wide, and read only before `app.whenReady()`. */
export function registerThumbnailScheme(
  register: (schemes: Electron.CustomScheme[]) => void,
): void {
  register([{ scheme: THUMBNAIL_SCHEME, privileges: THUMBNAIL_SCHEME_PRIVILEGES }]);
}

/** The caller names the session: the frames partition gets no handler, so a guest's fetch finds nothing to answer it. */
export function installThumbnailProtocol(target: Pick<Electron.Protocol, 'handle'>): void {
  target.handle(THUMBNAIL_SCHEME, handleThumbnailRequest);
}

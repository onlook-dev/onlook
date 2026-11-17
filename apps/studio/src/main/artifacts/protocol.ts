import { readFileSync, realpathSync } from 'node:fs';
import { extname, join, sep } from 'node:path';
import { ARTIFACT_ASSETS_DIR, ARTIFACT_ID_SHAPE, ARTIFACT_SCHEME } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import { artifactDir, artifactFilePath } from './dir.js';

/** Without fetch and CORS an artifact's own `@font-face` never reaches this handler (ONL-2568). */
export const ARTIFACT_SCHEME_PRIVILEGES: Electron.Privileges = {
  standard: true,
  secure: true,
  supportFetchAPI: true,
  corsEnabled: true,
  bypassCSP: false,
  allowServiceWorkers: false,
};

/** `'self'` resolves against the sandbox's opaque origin and matches nothing, so each grant names the scheme (ONL-2568). */
export const ARTIFACT_CSP =
  "default-src 'none'; " +
  `script-src 'unsafe-inline' ${ARTIFACT_SCHEME}:; ` +
  `style-src 'unsafe-inline' ${ARTIFACT_SCHEME}:; ` +
  `img-src ${ARTIFACT_SCHEME}: data:; ` +
  `font-src ${ARTIFACT_SCHEME}:; ` +
  `frame-src ${ARTIFACT_SCHEME}:; ` +
  "connect-src 'none'; " +
  "object-src 'none'; " +
  "form-action 'none'; " +
  "base-uri 'none'; " +
  "webrtc 'block'; " +
  'sandbox allow-scripts;';

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const refused = (): Response => new Response(null, { status: 403 });
const notFound = (): Response => new Response(null, { status: 404 });

/** Chromium leaves `%2F` encoded, so the decode can reintroduce a segment the allowlist never admitted (ONL-2568). */
function isPlainRelativePath(relative: string): boolean {
  if (relative === '' || relative.includes('\\')) return false;
  return relative
    .split('/')
    .every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export function createArtifactRequestHandler(
  store: Pick<ArtifactStore, 'readManifest'>,
): (request: { url: string }) => Promise<Response> {
  return async function handleArtifactRequest(request: { url: string }): Promise<Response> {
    let parsed: URL;
    try {
      parsed = new URL(request.url);
    } catch {
      return refused();
    }

    const id = parsed.host;
    if (!ARTIFACT_ID_SHAPE.test(id)) return refused();

    let relative: string;
    try {
      relative = decodeURIComponent(parsed.pathname.slice(1));
    } catch {
      return refused();
    }
    if (!isPlainRelativePath(relative)) return refused();

    const manifest = await store.readManifest(id);
    if (manifest === undefined) return refused();

    // Authorised by the URL's id alone: `initiatorOrigin` is absent or "null" here (ONL-2568).
    const named = manifest.pages.some((page) => page.path === relative);
    const code = relative.startsWith('pages/') && ['.css', '.js'].includes(extname(relative)) &&
      Array.isArray(manifest.files) && manifest.files.includes(relative);
    const asset = relative.startsWith(`${ARTIFACT_ASSETS_DIR}/`);
    if (!named && !asset && !code) return refused();

    let dir: string;
    let real: string;
    let expected: string;
    try {
      dir = realpathSync(artifactDir(id));
      real = realpathSync(artifactFilePath(id, relative));
      expected = join(dir, ...relative.split('/'));
    } catch {
      return notFound();
    }
    if (!real.startsWith(dir + sep)) return refused();
    // A symlink to a sibling artifact's page resolves inside this root and passes the line above.
    if (real !== expected) return refused();

    // Not `net.fetch`: the shared main-process electron stub has no `net` (ONL-2568).
    let bytes: Buffer;
    try {
      bytes = readFileSync(real);
    } catch {
      return notFound();
    }

    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': MIME[extname(real).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store',
        'content-security-policy': ARTIFACT_CSP,
      },
    });
  };
}

/** Process-wide, and read only before `app.whenReady()`. */
export function artifactSchemeRegistration(): Electron.CustomScheme {
  return { scheme: ARTIFACT_SCHEME, privileges: ARTIFACT_SCHEME_PRIVILEGES };
}

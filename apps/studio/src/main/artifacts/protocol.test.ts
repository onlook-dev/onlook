import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { ARTIFACT_FIRST_PAGE_PATH, ARTIFACT_SCHEME, artifactPageUrl } from '@studio/events';

const { ARTIFACT_CSP, ARTIFACT_SCHEME_PRIVILEGES, createArtifactRequestHandler } = await import(
  './protocol.js'
);
const { createArtifactStore } = await import('./store.js');
const { resetArtifactIndexCache } = await import('./state.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

const A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

let stateRoot: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'artifact-protocol' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetArtifactIndexCache();
});

const dirOf = (id: string): string => join(stateRoot, 'artifacts', id);

async function make(id: string, html = '<h1>page</h1>'): Promise<void> {
  await createArtifactStore({ mintId: () => id }).create({ title: 'Fixture', html });
}

const ask = async (url: string): Promise<Response> =>
  createArtifactRequestHandler(createArtifactStore())({ url });

describe('the scheme it registers', () => {
  it('equals its pinned privilege object, so a later edit is a visible diff', () => {
    expect(ARTIFACT_SCHEME_PRIVILEGES).toEqual({
      standard: true,
      secure: true,
      // Both on: an artifact's own @font-face does not load without them (ONL-2568).
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: false,
      allowServiceWorkers: false,
    });
  });
});

describe('the policy it serves', () => {
  it('equals the expected constant string exactly', async () => {
    await make(A);
    const res = await ask(artifactPageUrl(A, ARTIFACT_FIRST_PAGE_PATH));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBe(
      "default-src 'none'; " +
        "script-src 'unsafe-inline' studio-artifact:; " +
        "style-src 'unsafe-inline' studio-artifact:; " +
        'img-src studio-artifact: data:; ' +
        'font-src studio-artifact:; ' +
        'frame-src studio-artifact:; ' +
        "connect-src 'none'; " +
        "object-src 'none'; " +
        "form-action 'none'; " +
        "base-uri 'none'; " +
        "webrtc 'block'; " +
        'sandbox allow-scripts;',
    );
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
  });

  it('grants the artifact its own script, style, image and font, and denies every network destination', () => {
    // Read off the constant rather than a response, so the four render grants and the four
    // denials are each named where a reviewer sees them change.
    expect(ARTIFACT_CSP).toContain("script-src 'unsafe-inline'");
    expect(ARTIFACT_CSP).toContain("style-src 'unsafe-inline'");
    expect(ARTIFACT_CSP).toContain(`img-src ${ARTIFACT_SCHEME}:`);
    expect(ARTIFACT_CSP).toContain(`font-src ${ARTIFACT_SCHEME}:`);

    expect(ARTIFACT_CSP).toContain("connect-src 'none'");
    expect(ARTIFACT_CSP).toContain("form-action 'none'");
    expect(ARTIFACT_CSP).toContain("object-src 'none'");
    expect(ARTIFACT_CSP).toContain("base-uri 'none'");

    // No allow-same-origin, allow-popups, allow-forms, allow-modals or allow-top-navigation.
    expect(ARTIFACT_CSP).toContain('sandbox allow-scripts;');
    expect(ARTIFACT_CSP).not.toContain('allow-same-origin');
    expect(ARTIFACT_CSP).not.toContain('allow-popups');
    expect(ARTIFACT_CSP).not.toContain('allow-forms');
    expect(ARTIFACT_CSP).not.toContain('allow-modals');
    expect(ARTIFACT_CSP).not.toContain('allow-top-navigation');
    // `'self'` matches nothing against an opaque origin, so it must not be the grant.
    expect(ARTIFACT_CSP).not.toContain("'self'");
    // The CSP is decorative if this is ever set on the scheme.
    expect(ARTIFACT_SCHEME_PRIVILEGES.bypassCSP).toBe(false);
  });
});

describe('the gates, in order', () => {
  it('refuses a host that is not an artifact id', async () => {
    expect((await ask(`${ARTIFACT_SCHEME}://not-an-id/${ARTIFACT_FIRST_PAGE_PATH}`)).status).toBe(403);
    expect((await ask(`${ARTIFACT_SCHEME}://..%2F..%2Fetc/passwd`)).status).toBe(403);
    expect((await ask(`${ARTIFACT_SCHEME}://AAAAAAAA-1111-4111-8111-AAAAAAAAAAAA/x`)).status).toBe(403);
  });

  it('refuses an encoded separator that would re-enter the path after decoding', async () => {
    // Chromium leaves `%2F` encoded, so this reaches the gate as one segment that starts
    // `assets/` and only becomes `assets/../manifest.json` after the decode (ONL-2568).
    await make(A);

    expect((await ask(`${ARTIFACT_SCHEME}://${A}/assets%2F..%2Fmanifest.json`)).status).toBe(403);
    expect((await ask(`${ARTIFACT_SCHEME}://${A}/assets%2F.%2Fpic.png`)).status).toBe(403);
    expect((await ask(`${ARTIFACT_SCHEME}://${A}/assets%2F%2Fpic.png`)).status).toBe(403);
    expect((await ask(`${ARTIFACT_SCHEME}://${A}/assets%5Cpic.png`)).status).toBe(403);
  });

  it('refuses an id no artifact answers to', async () => {
    expect((await ask(artifactPageUrl(B, ARTIFACT_FIRST_PAGE_PATH))).status).toBe(403);
  });

  it('refuses a path the manifest does not name', async () => {
    await make(A);
    writeFileSync(join(dirOf(A), 'pages', 'secret.html'), 'not listed');

    expect((await ask(artifactPageUrl(A, 'pages/secret.html'))).status).toBe(403);
    expect((await ask(artifactPageUrl(A, 'manifest.json'))).status).toBe(403);
  });

  it('answers 404 for an asset the artifact names no file for', async () => {
    await make(A);
    expect((await ask(artifactPageUrl(A, 'assets/absent.png'))).status).toBe(404);
  });

  it('serves the artifact its own assets', async () => {
    await make(A);
    mkdirSync(join(dirOf(A), 'assets'), { recursive: true });
    writeFileSync(join(dirOf(A), 'assets', 'pic.png'), 'bytes');

    const res = await ask(artifactPageUrl(A, 'assets/pic.png'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('refuses a symlink to a sibling artifact, which resolves inside the root', async () => {
    await make(A, '<h1>A</h1>');
    await make(B, '<h1>B secret</h1>');
    mkdirSync(join(dirOf(A), 'assets'), { recursive: true });
    symlinkSync(join(dirOf(B), ARTIFACT_FIRST_PAGE_PATH), join(dirOf(A), 'assets', 'peek.html'));

    expect((await ask(artifactPageUrl(A, 'assets/peek.html'))).status).toBe(403);
  });

  it('refuses a symlink that leaves the store entirely', async () => {
    await make(A);
    const outside = join(stateRoot, 'outside.html');
    writeFileSync(outside, 'not an artifact');
    mkdirSync(join(dirOf(A), 'assets'), { recursive: true });
    symlinkSync(outside, join(dirOf(A), 'assets', 'escape.html'));

    expect((await ask(artifactPageUrl(A, 'assets/escape.html'))).status).toBe(403);
  });

  it('serves the page bytes for a request that passes every gate', async () => {
    await make(A, '<h1>the sketch</h1>');
    const res = await ask(artifactPageUrl(A, ARTIFACT_FIRST_PAGE_PATH));
    expect(await res.text()).toBe('<h1>the sketch</h1>');
  });
});

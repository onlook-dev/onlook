import { afterEach, describe, expect, test } from 'bun:test';
import { PICTURE_MAX_BYTES, resolvePicture, resetPictureCache } from './picture.js';

interface Call { url: string }

function respond(body: Uint8Array, type: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': type } });
}

function stubFetch(handler: (url: string, init?: RequestInit) => Promise<Response>): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url });
    return handler(url, init);
  }) as typeof fetch;
  return calls;
}

const png = new Uint8Array([137, 80, 78, 71]);
const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
  resetPictureCache();
});

describe('profile picture resolver', () => {
  test('answers a data URL carrying the type it validated, not the response header', async () => {
    stubFetch(async () => new Response(png, { status: 200, headers: { 'content-type': 'image/png; charset=binary' } }));
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toBe(`data:image/png;base64,${Buffer.from(png).toString('base64')}`);
  });

  test('refuses anything but https', async () => {
    const calls = stubFetch(async () => respond(png, 'image/png'));
    for (const url of ['http://pictures.onlook.test/a.png', 'file:///etc/passwd', 'data:image/png;base64,AAA', 'not a url']) {
      expect(await resolvePicture(url)).toBeNull();
    }
    expect(calls).toHaveLength(0);
  });

  test('refuses a redirect rather than following it off https', async () => {
    const calls = stubFetch(async (_url, init) => {
      expect(init?.redirect).toBe('error');
      return Response.redirect('http://127.0.0.1:9/private', 302);
    });
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toBeNull();
    expect(calls).toHaveLength(1);
  });

  test('refuses a non-raster type, including markup that an image tag would run', async () => {
    for (const type of ['image/svg+xml', 'text/html', 'application/json', '']) {
      stubFetch(async () => respond(png, type));
      expect(await resolvePicture(`https://pictures.onlook.test/${encodeURIComponent(type)}`)).toBeNull();
    }
  });

  test('refuses a body past the cap and a failing status', async () => {
    stubFetch(async () => respond(new Uint8Array(PICTURE_MAX_BYTES + 1), 'image/png'));
    expect(await resolvePicture('https://pictures.onlook.test/big.png')).toBeNull();
    stubFetch(async () => respond(png, 'image/png', 404));
    expect(await resolvePicture('https://pictures.onlook.test/gone.png')).toBeNull();
  });

  test('answers null when the fetch throws, so nothing waits on the network', async () => {
    stubFetch(async () => { throw new Error('offline'); });
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toBeNull();
  });

  test('keeps a success for the launch but retries after a failure', async () => {
    const failing = stubFetch(async () => { throw new Error('offline'); });
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toBeNull();
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toBeNull();
    expect(failing).toHaveLength(2);
    const succeeding = stubFetch(async () => respond(png, 'image/png'));
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toStartWith('data:image/png;base64,');
    expect(await resolvePicture('https://pictures.onlook.test/a.png')).toStartWith('data:image/png;base64,');
    expect(succeeding).toHaveLength(1);
  });
});

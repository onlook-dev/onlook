import { describe, expect, it } from 'bun:test';
import type { EvaluateResult } from '@studio/events';
import type { GuestImageResult, ThumbnailGuestDeps } from './cdp.js';
import { captureFrame, captureFrameForThumbnail, evaluateInFrame, type OffPage } from './gate.js';
import type { FrameMirrorReader } from './mirror.js';

it('admits only its own artifact URL and forwards the document-owned identity to both guest tools', async () => {
  const artifactId = 'artifact-a';
  const mirror = mirrorWith('studio-artifact://artifact-a/pages/index.html', 19);
  let evaluated: unknown;
  let captured: unknown;
  expect(await evaluateInFrame({ mirror, docId: 'doc', frameId: 'art', artifactId, script: '1', run: async (deps) => { evaluated = deps; return { ok: true, value: '1' }; } })).toMatchObject({ ok: true });
  expect(await captureFrame({ mirror, docId: 'doc', frameId: 'art', artifactId, run: async (deps) => { captured = deps; return { ok: true, pngBase64: '' }; } })).toMatchObject({ ok: true });
  expect(evaluated).toMatchObject({ artifactId, webContentsId: 19 });
  expect(captured).toMatchObject({ artifactId, webContentsId: 19 });
  for (const identity of [undefined, 'artifact-b']) {
    expect(await evaluateInFrame({ mirror, docId: 'doc', frameId: 'art', script: '1', ...(identity === undefined ? {} : { artifactId: identity }) })).toMatchObject({ ok: false });
  }
});

const mirrorWith = (currentUrl: string, webContentsId?: number): FrameMirrorReader => ({
  read: (_docId, ids) =>
    ids.map((id) => ({
      id,
      currentUrl,
      health: 'live' as const,
      title: '',
      ...(webContentsId !== undefined ? { webContentsId } : {}),
      console: [],
      errorCount: 0,
    })),
  peek: (_docId, id) => ({
    id,
    currentUrl,
    health: 'live' as const,
    title: '',
    ...(webContentsId !== undefined ? { webContentsId } : {}),
  }),
});

const emptyMirror: FrameMirrorReader = { read: () => [], peek: () => undefined };

const noRead = (mirror: FrameMirrorReader): FrameMirrorReader => ({
  peek: mirror.peek,
  read: () => {
    throw new Error('the thumbnail path peeks; a read drains the console lines the agent was promised');
  },
});

const capture = async (
  mirror: FrameMirrorReader,
  offPage?: OffPage,
): Promise<{ ok: boolean; reason?: string; ran: boolean; sawWebContentsId?: number }> => {
  let ran = false;
  let sawWebContentsId: number | undefined;
  const result = await captureFrame({
    mirror,
    docId: 'doc-1',
    frameId: 'frame-a',
    ...(offPage === undefined ? {} : { offPage }),
    run: async (deps) => {
      ran = true;
      sawWebContentsId = deps.webContentsId;
      return { ok: true as const, pngBase64: 'iVBORw0KGgo=' };
    },
  });
  return { ok: result.ok, ...(result.ok ? {} : { reason: result.reason }), ran, sawWebContentsId };
};

const run = async (
  mirror: FrameMirrorReader,
  offPage?: OffPage,
): Promise<{ result: EvaluateResult; ran: boolean; sawWebContentsId?: number }> => {
  let ran = false;
  let sawWebContentsId: number | undefined;
  const result = await evaluateInFrame({
    mirror,
    docId: 'doc-1',
    frameId: 'frame-a',
    script: 'document.title',
    ...(offPage === undefined ? {} : { offPage }),
    run: async (deps) => {
      ran = true;
      sawWebContentsId = deps.webContentsId;
      return { ok: true as const, value: '"t"' };
    },
  });
  return { result, ran, sawWebContentsId };
};

describe('the origin gate', () => {
  it('runs a script in a frame sitting on a local address', async () => {
    const { result, ran } = await run(mirrorWith('http://localhost:3000/products', 7));
    expect(ran).toBe(true);
    expect(result).toEqual({ ok: true, value: '"t"' });
  });

  it('runs for the loopback and IPv6 spellings too', async () => {
    expect((await run(mirrorWith('http://127.0.0.1:5173/', 7))).ran).toBe(true);
    expect((await run(mirrorWith('http://[::1]:5173/', 7))).ran).toBe(true);
  });

  it('runs a script on another site a frame shows too', async () => {
    const { result, ran } = await run(mirrorWith('https://mobbin.com/discover', 7));
    expect(ran).toBe(true);
    expect(result).toEqual({ ok: true, value: '"t"' });
  });

  it('refuses an unparseable address rather than allowing it', async () => {
    const { result, ran } = await run(mirrorWith('not a url at all', 7));
    expect(ran).toBe(false);
    expect(result.ok).toBe(false);
  });

  it('refuses a non-http scheme on a local-looking host', async () => {
    const { result, ran } = await run(mirrorWith('file://localhost/etc/passwd', 7));
    expect(ran).toBe(false);
    expect(result.ok).toBe(false);
  });

  it('refuses a frame the mirror knows nothing about', async () => {
    const { result, ran } = await run(emptyMirror);
    expect(ran).toBe(false);
    expect(result.ok).toBe(false);
  });

});

describe('a frame whose page the canvas is not showing', () => {
  const elsewhere: OffPage = { name: 'Settings' };

  it('refuses a capture by naming the page, not by doubting the frame exists', async () => {
    const { ok, ran, reason } = await capture(mirrorWith('http://localhost:3000/', 7), elsewhere);
    expect(ran).toBe(false);
    expect(ok).toBe(false);
    expect(reason).toContain('Settings');
    expect(reason).not.toContain('may not exist');
  });

  it('refuses a script the same way', async () => {
    const { result, ran } = await run(mirrorWith('http://localhost:3000/', 7), elsewhere);
    expect(ran).toBe(false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Settings');
      expect(result.reason).not.toContain('may not exist');
    }
  });

  it('refuses a frame the mirror has lost track of by naming its page too', async () => {
    const { result } = await run(emptyMirror, elsewhere);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Settings');
  });

  it('leaves a frame on the page the canvas IS showing running', async () => {
    const { result, ran } = await run(mirrorWith('http://localhost:3000/', 7));
    expect(ran).toBe(true);
    expect(result.ok).toBe(true);
  });
});

describe('what the gate hands the runner', () => {
  it('passes the MIRRORED webContents id, so the script lands in that frame', async () => {
    const { sawWebContentsId } = await run(mirrorWith('http://localhost:3000/', 42));
    expect(sawWebContentsId).toBe(42);
  });
});

describe('a capture, which any page a Frame shows admits (ONL-2658)', () => {
  it('photographs a local page, handing the mirrored id to the capture', async () => {
    const { ok, ran, sawWebContentsId } = await capture(mirrorWith('http://localhost:3000/products', 7));
    expect(ok).toBe(true);
    expect(ran).toBe(true);
    expect(sawWebContentsId).toBe(7);
  });

  it.each([
    ['a public site', 'https://example.com/pricing'],
    ['a LAN address', 'http://192.168.1.20:3000/'],
    ['a tailnet address', 'http://100.101.102.103:5173/'],
  ])('photographs %s', async (_, url) => {
    const shot = await capture(mirrorWith(url, 7));
    expect(shot.ran).toBe(true);
    expect(shot.ok).toBe(true);
  });

  it('refuses an unknown frame WITHOUT capturing', async () => {
    const unknown = await capture(emptyMirror);
    expect(unknown.ran).toBe(false);
    expect(unknown.ok).toBe(false);
  });
});

describe('the thumbnail capture, which the gate does not judge', () => {
  const photograph = async (
    mirror: FrameMirrorReader,
  ): Promise<{ ok: boolean; ran: boolean; saw?: ThumbnailGuestDeps }> => {
    let ran = false;
    let saw: ThumbnailGuestDeps | undefined;
    const result = await captureFrameForThumbnail({
      mirror,
      docId: 'doc-1',
      frameId: 'frame-a',
      deadlineMs: 750,
      run: async (deps) => {
        ran = true;
        saw = deps;
        return { ok: true, image: {} } as unknown as GuestImageResult;
      },
    });
    return { ok: result.ok, ran, saw };
  };

  it('photographs a frame on a remote address, forwarding the mirrored id and the deadline', async () => {
    const { ok, ran, saw } = await photograph(noRead(mirrorWith('https://accounts.google.com/signin', 7)));
    expect(ok).toBe(true);
    expect(ran).toBe(true);
    expect(saw?.webContentsId).toBe(7);
    expect(saw?.deadlineMs).toBe(750);
  });

  it('photographs a local page too', async () => {
    expect((await photograph(noRead(mirrorWith('http://localhost:3000/products', 7)))).ok).toBe(true);
  });

  it('refuses a frame the mirror knows nothing about, without capturing', async () => {
    const { ok, ran } = await photograph(noRead(emptyMirror));
    expect(ran).toBe(false);
    expect(ok).toBe(false);
  });
});

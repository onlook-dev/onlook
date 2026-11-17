import { expect, it, spyOn } from 'bun:test';
import type { Session, WebContents } from 'electron';
import { createFramePicture, forgetFramePicture, rememberedFramePicture, rememberFramePicture } from './picture.js';

function fixture() {
  let navigated: { isMainFrame: boolean } | undefined;
  const listeners = new Set<(details: { isMainFrame: boolean }) => void>();
  const image = () => ({ isEmpty: () => false, getSize: () => ({ width: 1600, height: 1000 }), crop: () => ({ resize: () => 'tile' }), toDataURL: () => 'picture', resize: () => ({ toDataURL: () => 'picture' }), toBitmap: () => { const page = Buffer.alloc(4096); page.writeUInt32LE(0xff00ff00, 2048); return page; } });
  const owner = { isDestroyed: () => false };
  const frames = { id: 'frames' } as unknown as Session;
  const guest = {
    hostWebContents: owner,
    session: frames,
    getType: () => 'webview', isDestroyed: () => false,
    getURL: () => 'http://localhost:3000/', isLoading: () => false,
    isBeingCaptured: () => false,
    debugger: { isAttached: () => false },
    on: (_event: string, listener: (details: { isMainFrame: boolean }) => void) => { listeners.add(listener); },
    removeListener: (_event: string, listener: (details: { isMainFrame: boolean }) => void) => { listeners.delete(listener); },
    capturePage: async () => image(),
    executeJavaScriptInIsolatedWorld: async () => {
      if (navigated) for (const listener of listeners) listener(navigated);
      return true;
    },
  };
  const picture = createFramePicture(() => guest as unknown as WebContents, () => undefined, () => frames);
  const remember = async (): Promise<void> => {
    rememberFramePicture(guest as unknown as WebContents);
    for (let tick = 0; tick < 6; tick += 1) await Promise.resolve();
  };
  return { owner: owner as WebContents, guest, picture, frames, image, remember, navigate: (isMainFrame: boolean) => { navigated = { isMainFrame }; }, listeners };
}

it('hands back the picture taken while the tab was still on screen, to the tab that owns the guest', async () => {
  const { picture, owner, remember } = fixture();
  await remember();
  expect(await picture({} as WebContents, { webContentsId: 1 })).toBeNull();
  expect(await picture(owner, { webContentsId: 1 })).toBe('picture');
});

it('retains screenshot detail when a Frame releases its guest', async () => {
  const { picture, owner, guest, image, remember } = fixture();
  let resized = false;
  guest.capturePage = async () => ({ ...image(), getSize: () => ({ width: 780, height: 3800 }), resize: () => { resized = true; return { toDataURL: () => 'picture' }; } });
  await remember();
  expect(await picture(owner, { webContentsId: 1 })).toBe('picture');
  expect(resized).toBe(false);
});

it('keeps a card tile of the last load for a next-task card, and only for that page', async () => {
  const { guest, remember } = fixture();
  await remember();
  expect(rememberedFramePicture(guest as unknown as WebContents) as unknown).toBe('tile');
  guest.getURL = () => 'http://localhost:3000/elsewhere';
  expect(rememberedFramePicture(guest as unknown as WebContents)).toBeUndefined();
});

it('never serves a remembered picture to another page', async () => {
  const { picture, owner, guest, remember } = fixture();
  await remember();
  guest.getURL = () => 'http://localhost:3000/elsewhere';
  expect(await picture(owner, { webContentsId: 1 })).toBeNull();
  guest.getURL = () => 'http://localhost:3000/';
  expect(await picture(owner, { webContentsId: 1 })).toBe('picture');
});

it('drops the picture when its page leaves, and takes a new one for the page that replaced it', async () => {
  const { picture, owner, guest, remember } = fixture();
  await remember();
  forgetFramePicture(guest as unknown as WebContents);
  expect(await picture(owner, { webContentsId: 1 })).toBeNull();
  await remember();
  expect(await picture(owner, { webContentsId: 1 })).toBe('picture');
});

it('takes the picture again for a Frame that has changed shape, and only for its own Tab', async () => {
  const { picture, owner, guest, remember } = fixture();
  await remember();
  guest.capturePage = async () => ({ isEmpty: () => false, getSize: () => ({ width: 800, height: 1600 }), crop: () => ({ resize: () => 'tile' }), toDataURL: () => 'taller', resize: () => ({ toDataURL: () => 'taller' }), toBitmap: () => { const page = Buffer.alloc(4096); page.writeUInt32LE(0xff00ff00, 2048); return page; } });
  expect(await picture({} as WebContents, { webContentsId: 1, retake: true })).toBeNull();
  expect(await picture(owner, { webContentsId: 1 })).toBe('picture');
  expect(await picture(owner, { webContentsId: 1, retake: true })).toBeNull();
  for (let tick = 0; tick < 6; tick += 1) await Promise.resolve();
  expect(await picture(owner, { webContentsId: 1 })).toBe('taller');
});

it('never captures for the picture itself: an off-screen view answers one flat colour', async () => {
  const { picture, owner, guest } = fixture();
  const capture = spyOn(guest, 'capturePage');
  try {
    expect(await picture(owner, { webContentsId: 1 })).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  } finally {
    capture.mockRestore();
  }
});

it('remembers nothing for a loading page, a suspended guest, or a capture with no ink in it', async () => {
  const { picture, owner, guest, image, remember } = fixture();
  guest.isLoading = () => true;
  await remember();
  guest.isLoading = () => false;
  guest.debugger = { isAttached: () => true };
  await remember();
  guest.debugger = { isAttached: () => false };
  guest.capturePage = async () => ({ ...image(), toBitmap: () => Buffer.alloc(4096) });
  await remember();
  expect(await picture(owner, { webContentsId: 1 })).toBeNull();
});

it('waits for paint and rejects a main-frame navigation racing that paint', async () => {
  const { picture, owner, navigate, listeners } = fixture();
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBe(true);
  navigate(false);
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBe(true);
  navigate(true);
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBeNull();
  expect(listeners.size).toBe(0);
});

it('refuses a guest off the Frames session or on an attachment placeholder', async () => {
  const { picture, owner, guest } = fixture();
  guest.session = { id: 'artifacts' } as unknown as Session;
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBeNull();
  guest.session = { id: 'frames' } as unknown as Session;
  guest.getURL = () => 'about:blank#studio-frame-born=test';
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBeNull();
});

it('validates guest ids before looking them up', async () => {
  const { picture, owner } = fixture();
  for (const webContentsId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(await picture(owner, { webContentsId })).toBeNull();
  }
});

it('reads paint readiness from one pixel, never a whole screenshot', async () => {
  const { picture, owner, guest } = fixture();
  let rect: unknown;
  guest.capturePage = (async (area?: unknown) => {
    rect = area;
    return { isEmpty: () => false, getSize: () => { throw new Error('readiness does not resize'); }, resize: () => { throw new Error('readiness does not encode'); }, toBitmap: () => Buffer.alloc(0) };
  }) as unknown as typeof guest.capturePage;
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBe(true);
  expect(rect).toEqual({ x: 0, y: 0, width: 1, height: 1 });
});

it('does not lift the picture before the document can paint', async () => {
  const { picture, owner, guest } = fixture();
  guest.executeJavaScriptInIsolatedWorld = async () => false;
  expect(await picture(owner, { webContentsId: 1, afterPaint: true })).toBeNull();
});

it('removes deadline listeners and rejects a paint reply arriving after timeout', async () => {
  const { picture, owner, guest, listeners } = fixture();
  let expire: (() => void) | undefined;
  let complete: ((ready: boolean) => void) | undefined;
  guest.executeJavaScriptInIsolatedWorld = () => new Promise(resolve => { complete = resolve; });
  const capture = spyOn(guest, 'capturePage');
  const timer = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void) => {
    expire = callback;
    return 123;
  }) as unknown as typeof setTimeout);
  try {
    const pending = picture(owner, { webContentsId: 1, afterPaint: true });
    expire!();
    expect(await pending).toBeNull();
    expect(listeners.size).toBe(0);
    complete!(true);
    await Promise.resolve();
    expect(capture).not.toHaveBeenCalled();
  } finally {
    timer.mockRestore();
    capture.mockRestore();
  }
});

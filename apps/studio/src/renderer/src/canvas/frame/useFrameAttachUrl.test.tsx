import '../../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import type { StudioBridge } from '@studio/events';
import { mountHook } from '../../testing/mountHook.js';
import { useFrameAttachUrl } from './useFrameAttachUrl.js';

const original = window.studio;
afterEach(() => { window.studio = original; });

for (const outcome of ['refused', 'failed'] as const) {
  it(`never falls back to the saved URL after an attachment is ${outcome}`, async () => {
    const refusals: string[] = [];
    window.studio = {
      canvasFrameAttach: async () => {
        if (outcome === 'failed') throw new Error('unavailable');
        return null;
      },
      onCanvasFrameBlocked: () => () => {},
    } as unknown as StudioBridge;
    const hook = await mountHook(() => useFrameAttachUrl('frame', 'http://localhost:4700/', 0, true, reason => { refusals.push(reason); }), undefined);
    expect(hook.current).toBeUndefined();
    expect(refusals).toEqual(['unavailable']);
    await hook.unmount();
  });
}

it('subscribes before requesting an attachment and covers this frame even when navigation targets a different port', async () => {
  let listener: Parameters<StudioBridge['onCanvasFrameBlocked']>[0] | undefined;
  let blocked = 0;
  let disconnected = false;
  window.studio = {
    onCanvasFrameBlocked: (next: Parameters<StudioBridge['onCanvasFrameBlocked']>[0]) => { listener = next; return () => { disconnected = true; }; },
    canvasFrameAttach: async () => {
      expect(listener).toBeDefined();
      listener!({ nodeId: 'other', url: 'http://localhost:4700/' });
      listener!({ nodeId: 'frame', url: 'http://localhost:4701/' });
      listener!({ nodeId: 'frame', url: 'http://127.0.0.1:4700/menu' });
      return null;
    },
  } as unknown as StudioBridge;
  const hook = await mountHook(() => useFrameAttachUrl('frame', 'http://localhost:4700/', 0, true, reason => { if (reason === 'blocked') blocked += 1; }), undefined);
  expect(blocked).toBe(2);
  expect(hook.current).toBeUndefined();
  await hook.unmount();
  expect(disconnected).toBe(true);
  listener!({ nodeId: 'frame', url: 'http://localhost:4700/' });
  expect(blocked).toBe(2);
});

it('ignores an old attachment answer after a port move and uses only the new lease', async () => {
  const replies: ((result: { url: string }) => void)[] = [];
  window.studio = {
    canvasFrameAttach: () => new Promise(resolve => { replies.push(resolve); }),
    onCanvasFrameBlocked: () => () => {},
  } as unknown as StudioBridge;
  const hook = await mountHook<string, string | undefined>((url) => useFrameAttachUrl('frame', url, 0), 'http://localhost:4700/');
  await hook.rerender('http://localhost:4701/');
  await hook.settle(() => { replies[0]!({ url: 'old-lease' }); });
  expect(hook.current).toBeUndefined();
  await hook.settle(() => { replies[1]!({ url: 'new-lease' }); });
  expect(hook.current).toBe('new-lease');
  await hook.unmount();
});

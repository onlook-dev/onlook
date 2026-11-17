import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'bun:test';
import type { WebContents } from 'electron';
import { IPC_SEND } from '@studio/events';
import { setTabFramesDiscarded } from './frames.js';
import { fromMainFrame, fromSubframe } from './test-support.js';

describe('Frame discard acknowledgement (ONL-2894)', () => {
  it('waits for this request on this renderer before allowing freeze', async () => {
    let requested = 0;
    const contents = Object.assign(new EventEmitter(), {
      ipc: new EventEmitter(), isDestroyed: () => false,
      send: (_channel: string, state: { request: number }) => { requested = state.request; },
    });
    let completed = false;
    const pending = setTabFramesDiscarded(contents as unknown as WebContents, true).then(() => { completed = true; });
    contents.ipc.emit(IPC_SEND.tabFramesApplied, fromMainFrame(contents), requested - 1);
    await Promise.resolve();
    expect(completed).toBe(false);
    contents.ipc.emit(IPC_SEND.tabFramesApplied, fromMainFrame(contents), requested);
    await pending;
    expect(completed).toBe(true);
    expect(contents.ipc.listenerCount(IPC_SEND.tabFramesApplied)).toBe(0);
    expect(contents.listenerCount('destroyed')).toBe(0);
  });

  it('does not take a subframe\'s word for it: only the view\'s own main frame acknowledges', async () => {
    let requested = 0;
    const contents = Object.assign(new EventEmitter(), {
      ipc: new EventEmitter(), isDestroyed: () => false,
      send: (_channel: string, state: { request: number }) => { requested = state.request; },
    });
    let completed = false;
    const pending = setTabFramesDiscarded(contents as unknown as WebContents, true).then(() => { completed = true; });
    contents.ipc.emit(IPC_SEND.tabFramesApplied, fromSubframe(contents), requested);
    await Promise.resolve();
    expect(completed).toBe(false);
    contents.ipc.emit(IPC_SEND.tabFramesApplied, fromMainFrame(contents), requested);
    await pending;
    expect(completed).toBe(true);
  });

  it('cleans up a failed send without leaving a timeout or listener', async () => {
    const contents = Object.assign(new EventEmitter(), {
      ipc: new EventEmitter(), isDestroyed: () => false,
      send: () => { throw new Error('closed during send'); },
    });
    await expect(setTabFramesDiscarded(contents as unknown as WebContents, true)).rejects.toThrow('closed during send');
    expect(contents.ipc.listenerCount(IPC_SEND.tabFramesApplied)).toBe(0);
    expect(contents.listenerCount('destroyed')).toBe(0);
  });
});

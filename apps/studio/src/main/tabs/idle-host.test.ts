import { EventEmitter } from 'node:events';
import { describe, expect, it, mock } from 'bun:test';
import { IPC_EMIT, IPC_SEND } from '@studio/events';
import { fromMainFrame, seatedTabs } from './test-support.js';

function rig() {
  const calls: string[] = [];
  const contents = Object.assign(new EventEmitter(), {
    id: 2894, ipc: new EventEmitter(), isDestroyed: () => false, getOSProcessId: () => 2894,
    send: (_channel: string, value: { discarded: boolean; request: number }) => {
      expect(_channel).toBe(IPC_EMIT.tabFrames);
      calls.push(value.discarded ? 'discard-guests' : 'mount-guests');
      queueMicrotask(() => contents.ipc.emit(IPC_SEND.tabFramesApplied, fromMainFrame(contents), value.request));
    },
    debugger: Object.assign(new EventEmitter(), { isAttached: () => attached, attach: () => { attached = true; },
      detach: () => { attached = false; },
      sendCommand: async (method: string, value?: { state?: string }) => {
        if (value?.state) calls.push(value.state);
        if (refuse) throw new Error('CDP refused');
        if (method === 'Runtime.evaluate') contents.debugger.emit('message', {}, 'Debugger.paused');
      } }),
  });
  let attached = false;
  let refuse = false;
  const view = { webContents: contents, setVisible: mock() };
  const tab = { id: 'project', view, isWorking: false, status: undefined as string | undefined, idle: undefined as { wake(): Promise<void> } | undefined };
  const teardown = mock();
  const host = seatedTabs({
    tabs: new Map([[tab.id, tab]]), activeId: 'other', visibleId: 'other', activation: 0,
    cooling: { touch: mock() },
    decisionsFor: () => ({ isBusy: tab.isWorking || tab.status === 'waiting' }), teardown,
  });
  return { host, tab, view, calls, teardown, refuse: () => { refuse = true; } };
}

describe('TabHost idle cooling retains the shell (ONL-2894)', () => {
  it('keeps the same view and its slots while discarding guests', async () => {
    const subject = rig();
    await subject.host.cool(subject.tab.id);
    expect(subject.tab.view).toBe(subject.view);
    expect(subject.calls).toEqual(['discard-guests', 'frozen']);
    expect(subject.teardown).not.toHaveBeenCalled();
    await subject.host.resume(subject.tab);
    expect(subject.calls).toEqual(['discard-guests', 'frozen', 'active', 'mount-guests']);
    expect(subject.view.setVisible).not.toHaveBeenCalled();
  });

  it('uses the original teardown when CDP refuses', async () => {
    const subject = rig();
    subject.refuse();
    await subject.host.cool(subject.tab.id);
    expect(subject.teardown).toHaveBeenCalledWith(subject.tab.id);
  });

  it('does not reveal a resumed tab after the user selects another tab', async () => {
    const subject = rig();
    let finish = (): void => {};
    subject.tab.idle = { wake: () => new Promise<void>(resolve => { finish = resolve; }) };
    subject.host.tabs.set('other', { id: 'other' });
    subject.host.warm = mock();
    subject.host.activate(subject.tab.id);
    subject.host.activate('other');
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(subject.host.warm).not.toHaveBeenCalled();
    expect(subject.host.activeId).toBe('other');
  });

  it('does not tear down a tab that becomes busy while its resume fails', async () => {
    const subject = rig();
    let fail = (_error: Error): void => {};
    subject.tab.idle = { wake: () => new Promise<void>((_resolve, reject) => { fail = reject; }) };
    subject.host.activate(subject.tab.id);
    subject.tab.isWorking = true;
    fail(new Error('resume refused'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(subject.teardown).not.toHaveBeenCalled();
    expect(subject.tab.view).toBe(subject.view);
  });

  for (const status of ['working', 'waiting', 'active', 'covering']) {
    it(`refuses to discard a ${status} tab`, async () => {
      const subject = rig();
      if (status === 'working') subject.tab.isWorking = true;
      if (status === 'waiting') subject.tab.status = 'waiting';
      if (status === 'active') subject.host.activeId = subject.tab.id;
      if (status === 'covering') subject.host.visibleId = subject.tab.id;
      await subject.host.cool(subject.tab.id);
      expect(subject.calls).toEqual([]);
    });
  }
});

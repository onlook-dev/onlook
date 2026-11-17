import type { WebContents } from 'electron';
import { IPC_EMIT, IPC_SEND } from '@studio/events';
import { onView } from '../ipc/bridge.js';

let sequence = 0;

export function setTabFramesDiscarded(contents: WebContents, discarded: boolean): Promise<void> {
  const request = ++sequence;
  return new Promise((resolve, reject) => {
    const finish = (error?: Error): void => {
      clearTimeout(timer);
      unhear();
      contents.removeListener('destroyed', destroyed);
      if (error) reject(error);
      else resolve();
    };
    const applied = (_event: unknown, actual: number): void => { if (actual === request) finish(); };
    const destroyed = (): void => { finish(new Error('tab closed while changing Frame lifetime')); };
    const timer = setTimeout(() => { finish(new Error('tab did not acknowledge Frame lifetime')); }, 2000);
    const unhear = onView(contents, IPC_SEND.tabFramesApplied, applied);
    contents.once('destroyed', destroyed);
    if (contents.isDestroyed()) { destroyed(); return; }
    try {
      contents.send(IPC_EMIT.tabFrames, { discarded, request });
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

// A named 'electron' import fails the ESM link check under plain Bun, which the suite runs under.
import electron from 'electron';
import { on } from '../ipc/bridge.js';
import { IPC_SEND, isRecord, type DevThrowRequest } from '@studio/events';
import { readSwitch } from '../env/dev-switches.js';

function devErrorHookEnabled(env?: NodeJS.ProcessEnv, isPackaged: boolean = electron.app.isPackaged): boolean {
  return readSwitch('errorHook', env) === '1' && !isPackaged;
}

function throwForLayer(layer: DevThrowRequest['layer']): void {
  if (layer === 'main') {
    setTimeout(() => {
      throw new Error('dev hook: main threw');
    }, 0);
    return;
  }
  if (layer === 'main-rejection') void Promise.reject(new Error('dev hook: main rejected'));
}

export function registerDevErrorHook(): void {
  if (!devErrorHookEnabled()) return;
  on(IPC_SEND.devThrow, (_event, req: DevThrowRequest) => {
    if (!isRecord(req)) return;
    throwForLayer((req as DevThrowRequest).layer);
  });
}

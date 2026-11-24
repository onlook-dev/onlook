import { EventEmitter } from 'node:events';
import type { AppUpdater } from 'electron-updater';
import { proofSwitchOn } from '../diagnostics/gate.js';
import type { UpdateMachine } from './machine.js';
import { createUpdateSession } from './session.js';

export function installUpdateProof(machine: UpdateMachine): ReturnType<typeof createUpdateSession> | undefined {
  if (!proofSwitchOn('STUDIO_UPDATE_PROOF')) return undefined;
  const installed = '0.0.0-beta.3000';
  let offered: string | null = '0.0.0-beta.3001';
  let downloaded: string | undefined;
  let finish: ((error?: Error) => void) | undefined;
  let holding = false;
  let answer: (() => void) | undefined;
  const downloads: string[] = [];
  const installs: string[] = [];
  const failures: string[] = [];
  const nativeUpdater = new EventEmitter();
  const updater = Object.assign(new EventEmitter(), {
    autoDownload: false,
    autoInstallOnAppQuit: true,
    async checkForUpdates() {
      updater.emit('checking-for-update');
      if (holding) await new Promise<void>((resolve) => { answer = resolve; });
      if (offered === null) {
        updater.emit('update-not-available', { version: installed });
        return { isUpdateAvailable: false, updateInfo: { version: installed } };
      }
      updater.emit('update-available', { version: offered });
      return { isUpdateAvailable: true, updateInfo: { version: offered } };
    },
    async downloadUpdate() {
      const version = offered ?? installed;
      downloads.push(version);
      await new Promise<void>((resolve, reject) => {
        finish = (error) => {
          if (error) {
            reject(error);
            return;
          }
          downloaded = version;
          updater.emit('update-downloaded', { version });
          resolve();
        };
      });
      return [];
    },
    quitAndInstall() {
      if (!downloaded) throw new Error('No update has downloaded');
      installs.push(downloaded);
    },
  });
  const session = createUpdateSession(updater as unknown as AppUpdater, machine, nativeUpdater, (stage) => { failures.push(stage); });
  Object.assign(globalThis, { __studioUpdateProof: {
    offer(version: string | null) { offered = version; },
    check() { return session.check(); },
    request() { void session.check(true); },
    holdCheck() { holding = true; },
    finishCheck() { const go = answer; answer = undefined; holding = false; go?.(); },
    download() { const complete = finish; finish = undefined; complete?.(); },
    failDownload() { const complete = finish; finish = undefined; complete?.(new Error('The replacement download was interrupted')); },
    prepare() { nativeUpdater.emit('update-downloaded'); },
    fail() { updater.emit('error', new Error('Squirrel could not prepare the update')); },
    diskFull() { updater.emit('error', new Error('No space left on device')); },
    authorizationDenied() { updater.emit('error', new Error('The operation couldn’t be completed. (OSStatus error -60005.)')); },
    snapshot() { return { downloads: [...downloads], installs: [...installs], failures: [...failures], state: machine.current() }; },
  } });
  return session;
}

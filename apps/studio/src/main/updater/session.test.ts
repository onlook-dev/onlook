import { afterEach, describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import { setImmediate as settle } from 'node:timers/promises';
import type { AppUpdater } from 'electron-updater';
import type { UpdateState } from '@studio/events';
import { UpdateMachine } from './machine.js';
import { createUpdateSession } from './session.js';

class UpdateFixture extends EventEmitter {
  autoDownload = true;
  autoInstallOnAppQuit = false;
  version = '1.2.3';
  stagedVersion: string | undefined;
  downloads: string[] = [];
  installs: string[] = [];
  failCheck = false;
  failDownload = false;
  hasNothingNewer = false;
  pauseCheck = false;
  finishDownload: (() => void) | undefined;
  finishCheck: (() => void) | undefined;
  checkForUpdates = async () => {
    this.emit('checking-for-update');
    if (this.failCheck) throw new Error('net::ERR_NAME_NOT_RESOLVED');
    if (this.pauseCheck) await new Promise<void>((resolve) => { this.finishCheck = resolve; });
    if (this.hasNothingNewer) {
      this.emit('update-not-available', { version: this.version });
      return { isUpdateAvailable: false, updateInfo: { version: this.version } };
    }
    this.emit('update-available', { version: this.version });
    return { isUpdateAvailable: true, updateInfo: { version: this.version } };
  };
  downloadUpdate = async () => {
    this.downloads.push(this.version);
    await new Promise<void>((resolve, reject) => {
      this.finishDownload = () => {
        if (this.failDownload) {
          const error = new Error('download interrupted');
          this.emit('error', error);
          reject(error);
        } else {
          this.stagedVersion = this.version;
          this.emit('update-downloaded', { version: this.version });
          resolve();
        }
      };
    });
    return [];
  };
  quitAndInstall = () => { this.installs.push(this.stagedVersion ?? 'missing'); };
}

const sessions: Array<ReturnType<typeof createUpdateSession>> = [];
afterEach(() => { for (const session of sessions.splice(0)) session.dispose(); });

function fixture(native = true, wait?: (delay: number, signal: AbortSignal) => Promise<void>, recovery: Parameters<typeof createUpdateSession>[5] = {}) {
  const seen: UpdateState[] = [];
  const reports: Array<{ stage: string; error: unknown }> = [];
  const updater = new UpdateFixture();
  const nativeUpdater = new EventEmitter();
  const machine = new UpdateMachine({ emit: (state) => seen.push(state), waitForNativeStage: native });
  const session = createUpdateSession(updater as unknown as AppUpdater, machine, native ? nativeUpdater : undefined, (stage, error) => { reports.push({ stage, error }); }, wait, recovery);
  sessions.push(session);
  const download = async () => {
    const check = session.check();
    await settle();
    updater.finishDownload?.();
    await check;
  };
  return { updater, nativeUpdater, machine, session, seen, reports, download };
}

describe('the real updater event sequence', () => {
  it.each([403, 404, 500, 503])('reports download HTTP %s once after bounded retries', async (status) => {
    const delays: number[] = [];
    const test = fixture(false, async (delay) => { delays.push(delay); });
    let attempts = 0;
    test.updater.downloadUpdate = async () => {
      attempts += 1;
      const error = new Error(`Cannot download "https://updates.example/update.zip", status ${status}: unavailable`);
      test.updater.emit('error', error);
      throw error;
    };
    await test.session.check(true);
    expect(attempts).toBe(status >= 500 ? 3 : 1);
    expect(delays).toEqual(status >= 500 ? [1000, 2000] : []);
    expect(test.reports).toHaveLength(1);
    expect(test.reports[0]?.stage).toBe('download');
    expect(test.machine.current().status).toBe('idle');
  });

  it('pauses a native authorization failure emitted and rejected during download without retrying it', async () => {
    const delays: number[] = [];
    const test = fixture(true, async (delay) => { delays.push(delay); });
    test.updater.downloadUpdate = async () => {
      const error = new Error('OSStatus error -60005.');
      test.updater.emit('error', error);
      throw error;
    };
    await test.session.check();
    await test.session.check();
    expect(delays).toEqual([]);
    expect(test.machine.current()).toEqual({ status: 'error', message: 'UPDATE_AUTHORIZATION_DENIED' });
    expect(test.reports).toHaveLength(1);
    expect(test.updater.autoInstallOnAppQuit).toBe(false);
  });

  it('restores an authorization pause after relaunch and saves recovery only after native preparation', async () => {
    const saved: boolean[] = [];
    const test = fixture(true, undefined, { authorizationPaused: true, onAuthorizationPauseChange: (paused) => { saved.push(paused); } });
    await test.session.check();
    expect(test.updater.downloads).toEqual([]);
    expect(test.updater.autoInstallOnAppQuit).toBe(false);
    expect(test.machine.current()).toEqual({ status: 'error', message: 'UPDATE_AUTHORIZATION_DENIED' });
    const retry = test.session.check(true);
    await settle();
    test.updater.finishDownload?.();
    await retry;
    expect(saved).toEqual([]);
    test.nativeUpdater.emit('update-downloaded');
    expect(saved).toEqual([false]);
  });

  it('saves an authorization pause once even when native errors repeat', async () => {
    const saved: boolean[] = [];
    const test = fixture(true, undefined, { onAuthorizationPauseChange: (paused) => { saved.push(paused); } });
    await test.download();
    test.updater.emit('error', new Error('OSStatus error -60005.'));
    test.updater.emit('error', new Error('OSStatus error -60005.'));
    await test.session.check();
    expect(saved).toEqual([true]);
    expect(test.reports).toHaveLength(1);
    expect(test.updater.downloads).toHaveLength(1);
  });

  it('pauses automatic updates after macOS denies authorization and allows an explicit retry', async () => {
    const test = fixture();
    await test.download();
    test.updater.emit('error', new Error('The operation couldn’t be completed. (OSStatus error -60005.)'));
    expect(test.machine.current()).toEqual({ status: 'error', message: 'UPDATE_AUTHORIZATION_DENIED' });
    expect(test.updater.autoInstallOnAppQuit).toBe(false);
    await test.session.check();
    expect(test.updater.downloads).toHaveLength(1);
    const retry = test.session.check(true);
    await settle();
    expect(test.updater.autoInstallOnAppQuit).toBe(true);
    test.updater.finishDownload?.();
    await retry;
    test.nativeUpdater.emit('update-downloaded');
    expect(test.machine.current().status).toBe('downloaded');
  });

  it('retries download server errors without reporting a recovered failure', async () => {
    const delays: number[] = [];
    const test = fixture(false, async (delay) => { delays.push(delay); });
    let attempts = 0;
    test.updater.downloadUpdate = async () => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('Cannot download "https://updates.example/update.zip", status 503: Service Unavailable');
        test.updater.emit('error', error);
        throw error;
      }
      test.updater.emit('update-downloaded', { version: test.updater.version });
      return [];
    };
    await test.session.check(true);
    expect(attempts).toBe(3);
    expect(delays).toEqual([1000, 2000]);
    expect(test.reports).toEqual([]);
    expect(test.machine.current().status).toBe('downloaded');
  });

  for (const { label, error } of [
    { label: 'native text', error: new Error('No space left on device') },
    { label: 'errno only', error: Object.assign(new Error('write failed'), { code: 'ENOSPC' }) },
    { label: 'multiline', error: new Error('Unable to install update\nNo space left on device') },
  ]) {
    it(`shows disk-full guidance on the first failed download: ${label}`, async () => {
      const test = fixture(false);
      test.updater.downloadUpdate = async () => {
        test.updater.emit('error', error);
        throw error;
      };
      await test.session.check();
      expect(test.machine.current()).toEqual({ status: 'error', message: 'ENOSPC' });
      expect(test.reports.map((report) => report.stage)).toEqual(['download']);
    });
  }

  it('retries transient check errors with exponential backoff without reporting recovered errors', async () => {
    const delays: number[] = [];
    const test = fixture(false, async (delay) => { delays.push(delay); });
    let attempts = 0;
    test.updater.checkForUpdates = async () => {
      attempts += 1;
      test.updater.emit('checking-for-update');
      if (attempts < 3) {
        const error = Object.assign(new Error('500 Internal Server Error'), { statusCode: 500 });
        test.updater.emit('error', error);
        throw error;
      }
      test.updater.emit('update-not-available');
      return { isUpdateAvailable: false, updateInfo: { version: '1.2.3' } };
    };
    await test.session.check(true);
    expect(attempts).toBe(3);
    expect(delays).toEqual([1000, 2000]);
    expect(test.reports).toEqual([]);
    expect(test.seen.some((state) => state.status === 'error')).toBe(false);
    // The claim has to survive the awaited backoff, or the user who clicked gets no pill at all (ONL-2620).
    expect(test.machine.current()).toEqual({ status: 'up-to-date', requested: true });
  });

  for (const statusCode of [403, 404, 500, 503]) {
    it(`reports HTTP ${statusCode} once after only retryable checks exhaust their budget`, async () => {
      const delays: number[] = [];
      const test = fixture(false, async (delay) => { delays.push(delay); });
      let attempts = 0;
      test.updater.checkForUpdates = async () => {
        attempts += 1;
        test.updater.emit('checking-for-update');
        const error = Object.assign(new Error(`${statusCode} HTTP failure`), { statusCode });
        test.updater.emit('error', error);
        throw error;
      };
      await test.session.check(true);
      expect(attempts).toBe(statusCode >= 500 ? 3 : 1);
      expect(delays).toEqual(statusCode >= 500 ? [1000, 2000] : []);
      expect(test.reports.map((report) => report.stage)).toEqual(['check']);
      expect(test.machine.current().status).toBe('error');
      // A claim left behind would put a pill on the next check nobody asked for (ONL-2620).
      expect(test.machine.current().requested).toBeUndefined();
    });
  }

  it('does not overlap checks during backoff and cancels retries when disposed', async () => {
    let waiting: AbortSignal | undefined;
    let release: (() => void) | undefined;
    const test = fixture(false, async (_delay, signal) => {
      waiting = signal;
      await new Promise<void>((resolve) => { release = resolve; });
    });
    let attempts = 0;
    test.updater.checkForUpdates = async () => {
      attempts += 1;
      throw new Error('503 Service Unavailable');
    };
    const check = test.session.check(true);
    await settle();
    await test.session.check(true);
    expect(attempts).toBe(1);
    test.session.dispose();
    expect(waiting?.aborted).toBe(true);
    release?.();
    await check;
    expect(attempts).toBe(1);
    expect(test.reports).toEqual([]);
  });
  it('does not replace a staged beta with an older feed version', async () => {
    const test = fixture();
    test.updater.version = '0.0.0-beta.3002';
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    test.updater.version = '0.0.0-beta.3001';
    await test.session.check();
    expect(test.updater.downloads).toEqual(['0.0.0-beta.3002']);
    expect(test.machine.current().version).toBe('0.0.0-beta.3002');
  });

  it('downloads manually and never re-stages the same version', async () => {
    const test = fixture();
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    await test.session.check();
    expect(test.updater.autoDownload).toBe(false);
    expect(test.updater.downloads).toEqual(['1.2.3']);
    expect(test.machine.current()).toEqual({ status: 'downloaded', version: '1.2.3' });
  });

  it('holds a restart through replacement download AND native preparation', async () => {
    const test = fixture();
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    test.updater.version = '1.2.4';
    const refresh = test.session.check();
    await settle();
    test.session.restart();
    test.session.restart();
    expect(test.updater.installs).toEqual([]);
    test.updater.finishDownload?.();
    await refresh;
    expect(test.updater.installs).toEqual([]);
    expect(test.machine.current()).toEqual({ status: 'downloaded', version: '1.2.4', restarting: true });
    test.nativeUpdater.emit('update-downloaded');
    expect(test.updater.installs).toEqual(['1.2.4']);
    expect(test.seen.slice(2).every((state) => state.status === 'downloaded')).toBe(true);
  });

  it('does not overlap checks or downloads while native preparation is pending', async () => {
    const test = fixture();
    const check = test.session.check();
    await test.session.check(true);
    await settle();
    test.updater.finishDownload?.();
    await check;
    test.updater.version = '1.2.4';
    await test.session.check();
    expect(test.updater.downloads).toEqual(['1.2.3']);
  });

  it('cancels a held restart on a staging error and can retry successfully', async () => {
    const test = fixture();
    await test.download();
    test.session.restart();
    test.updater.emit('error', new Error('Squirrel preparation failed\nprivate stack'));
    expect(test.machine.current()).toEqual({ status: 'error', message: 'Squirrel preparation failed' });
    expect(test.reports.map((report) => report.stage)).toEqual(['install']);
    expect(test.updater.installs).toEqual([]);
    test.nativeUpdater.emit('update-downloaded');
    expect(test.updater.installs).toEqual([]);
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    expect(test.machine.current().restarting).toBeUndefined();
    test.session.restart();
    await settle();
    expect(test.updater.installs).toEqual(['1.2.3']);
  });

  it('keeps a prepared update through an offline refresh without counting it as an install error', async () => {
    const test = fixture();
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    test.updater.failCheck = true;
    await test.session.check();
    expect(test.machine.current()).toEqual({ status: 'downloaded', version: '1.2.3' });
    expect(test.reports.map((report) => report.stage)).toEqual(['check']);
  });

  it('installs the prepared update when the restart-time feed check is offline', async () => {
    const test = fixture();
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    test.updater.failCheck = true;
    test.session.restart();
    await settle();
    expect(test.updater.installs).toEqual(['1.2.3']);
    expect(test.machine.current()).toEqual({ status: 'downloaded', version: '1.2.3', restarting: true });
    expect(test.reports.map((report) => report.stage)).toEqual(['check']);
  });

  it.each([false, true])('keeps the prepared update after a replacement download fails with restart pending: %s', async (restarting) => {
    const test = fixture();
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    test.updater.version = '1.2.4';
    test.updater.failDownload = true;
    const refresh = test.session.check();
    await settle();
    if (restarting) test.session.restart();
    test.updater.finishDownload?.();
    await refresh;
    expect(test.machine.current()).toEqual({ status: 'downloaded', version: '1.2.3', ...(restarting ? { restarting: true } : {}) });
    expect(test.updater.installs).toEqual(restarting ? ['1.2.3'] : []);
    expect(test.reports.map((report) => report.stage)).toEqual(['download']);
    expect(test.seen.some((state) => state.status === 'error')).toBe(false);
  });

  it('reports an emitted and rejected download failure only once', async () => {
    const test = fixture(false);
    test.updater.failDownload = true;
    await test.download();
    expect(test.reports.map((report) => report.stage)).toEqual(['download']);
    expect(test.machine.current().status).toBe('idle');
  });

  it('leaves a periodic check with nothing to say unclaimed, and answers a requested one', async () => {
    const test = fixture();
    test.updater.hasNothingNewer = true;

    await test.session.check();
    expect(test.seen).toEqual([{ status: 'checking' }, { status: 'up-to-date' }]);

    await test.session.check(true);
    expect(test.seen.slice(2)).toEqual([
      { status: 'checking', requested: true },
      { status: 'checking', requested: true },
      { status: 'up-to-date', requested: true },
    ]);
  });

  it('answers a click that lands while a background check is still in flight', async () => {
    const test = fixture();
    test.updater.hasNothingNewer = true;
    test.updater.pauseCheck = true;

    const background = test.session.check();
    await settle();
    expect(test.seen).toEqual([{ status: 'checking' }]);

    await test.session.check(true);
    test.updater.finishCheck?.();
    await background;

    expect(test.seen.at(-1)).toEqual({ status: 'up-to-date', requested: true });
    expect(test.updater.downloads).toEqual([]);
  });

  it('checks the feed on a restart click instead of installing the hours-old download', async () => {
    const test = fixture();
    await test.download();
    test.nativeUpdater.emit('update-downloaded');
    test.updater.version = '1.2.4';
    test.session.restart();
    await settle();
    expect(test.updater.installs).toEqual([]);
    test.updater.finishDownload?.();
    await settle();
    test.nativeUpdater.emit('update-downloaded');
    expect(test.updater.installs).toEqual(['1.2.4']);
  });
});

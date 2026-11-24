import type { AppUpdater } from 'electron-updater';
import { isDiskFull } from '@studio/events';
import { setTimeout as delay } from 'node:timers/promises';
import { gt } from 'semver';
import { log } from '../log/index.js';
import { reportUpdateFailure, updateHttpStatus, type UpdateFailureStage } from './check.js';
import type { UpdateMachine } from './machine.js';
import { capture } from '../telemetry/index.js';

const logger = log('updater');

export interface NativeStageEmitter {
  on(event: 'update-downloaded', listener: () => void): unknown;
  removeListener(event: 'update-downloaded', listener: () => void): unknown;
}

export function createUpdateSession(
  updater: AppUpdater,
  machine: UpdateMachine,
  nativeUpdater?: NativeStageEmitter,
  report: typeof reportUpdateFailure = reportUpdateFailure,
  wait: (ms: number, signal: AbortSignal) => Promise<void> = (ms, signal) => delay(ms, undefined, { signal }),
): { check(requested?: boolean): Promise<void>; restart(): void; dispose(): void } {
  let busy = false;
  let stage: UpdateFailureStage = 'check';
  const lifetime = new AbortController();
  let checkingAttempt = false;
  let checkError: Error | undefined;
  const reported = new WeakSet<Error>();
  const failure = (error: Error): void => {
    if (lifetime.signal.aborted) return;
    if (reported.has(error)) return;
    reported.add(error);
    const failedStage = machine.isStaging() || (!busy && machine.current().status === 'downloaded') ? 'install' : stage;
    logger.warn('update failed', { stage: failedStage, error });
    report(failedStage, error);
    machine.failed(isDiskFull(error) ? 'ENOSPC' : error.message.split('\n')[0] ?? error.message, failedStage);
  };
  const onError = (error: Error): void => {
    if (checkingAttempt) checkError = error;
    else failure(error);
  };
  const checking = (): void => machine.checking();
  const available = (info: { version: string }): void => machine.available(info.version);
  const upToDate = (): void => machine.upToDate();
  const progress = (info: { percent: number }): void => machine.downloading(Math.round(info.percent));
  const downloaded = (info: { version: string }): void => {
    logger.info('downloaded', { version: info.version });
    stage = 'install';
    machine.downloaded(info.version);
  };
  const staged = (): void => {
    logger.info('prepared for install', { version: machine.current().version });
    machine.nativeStaged();
  };

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', checking);
  updater.on('update-available', available);
  updater.on('update-not-available', upToDate);
  updater.on('download-progress', progress);
  updater.on('update-downloaded', downloaded);
  updater.on('error', onError);
  nativeUpdater?.on('update-downloaded', staged);

  const session = {
    async check(requested = false): Promise<void> {
      if (lifetime.signal.aborted) return;
      // A click during a check in flight adopts it rather than queueing a second; only `busy` guarantees the `checkFinished()` that spends the claim (ONL-2620).
      if (busy) {
        if (requested) machine.claimCheck();
        return;
      }
      if (machine.isStaging() || machine.current().restarting) return;
      busy = true;
      capture('update_check_started', { requested });
      stage = 'check';
      const prior = machine.current();
      const stagedVersion = prior.status === 'downloaded' ? prior.version : undefined;
      if (requested) machine.requestCheck();
      try {
        let result: Awaited<ReturnType<AppUpdater['checkForUpdates']>>;
        for (let attempt = 0; ; attempt += 1) {
          checkingAttempt = true;
          checkError = undefined;
          try {
            result = await updater.checkForUpdates();
            if (checkError) throw checkError;
            break;
          } catch (error) {
            const status = updateHttpStatus(error);
            if (status === undefined || status < 500 || status > 599 || attempt >= 2) throw error;
          } finally {
            checkingAttempt = false;
          }
          await wait(1000 * 2 ** attempt, lifetime.signal);
          if (lifetime.signal.aborted) return;
        }
        if (lifetime.signal.aborted) return;
        capture('update_check_completed', { requested, outcome: result?.isUpdateAvailable ? 'available' : 'up_to_date' });
        if (result?.isUpdateAvailable && (!stagedVersion || gt(result.updateInfo.version, stagedVersion))) {
          stage = 'download';
          await updater.downloadUpdate();
        }
      } catch (error) {
        failure(error instanceof Error ? error : new Error(String(error)));
      } finally {
        busy = false;
        if (!lifetime.signal.aborted) machine.checkFinished();
      }
    },
    restart(): void {
      if (!machine.canRestart()) return;
      if (!busy && !machine.isStaging()) void session.check();
      machine.restart(() => updater.quitAndInstall());
    },
    dispose(): void {
      lifetime.abort();
      updater.removeListener('checking-for-update', checking);
      updater.removeListener('update-available', available);
      updater.removeListener('update-not-available', upToDate);
      updater.removeListener('download-progress', progress);
      updater.removeListener('update-downloaded', downloaded);
      updater.removeListener('error', onError);
      nativeUpdater?.removeListener('update-downloaded', staged);
      machine.dispose();
    },
  };
  return session;
}

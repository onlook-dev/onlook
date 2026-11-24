import type { AppUpdater } from 'electron-updater';
import { isDiskFull } from '@studio/events';
import { setTimeout as delay } from 'node:timers/promises';
import { gt } from 'semver';
import { log } from '../log/index.js';
import { reportUpdateFailure, updateAuthorizationDenied, updateHttpStatus, type UpdateFailureStage } from './check.js';
import type { UpdateMachine } from './machine.js';

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
  recovery: { refusedVersion?: string | null; onRefusedVersionChange?: (version: string | null) => void } = {},
): { check(requested?: boolean): Promise<void>; restart(): void; dispose(): void } {
  let busy = false;
  let stage: UpdateFailureStage = 'check';
  const lifetime = new AbortController();
  let attempting = false;
  let attemptError: Error | undefined;
  let refusedVersion = recovery.refusedVersion ?? null;
  let attemptedVersion: string | undefined;
  let checkRequested = false;
  const pauseAuthorization = (version: string | null): void => {
    if (refusedVersion === version) return;
    refusedVersion = version;
    recovery.onRefusedVersionChange?.(version);
  };
  const canAttempt = (version: string): boolean => checkRequested || version !== refusedVersion;
  const reported = new WeakSet<Error>();
  const failure = (error: Error): void => {
    if (lifetime.signal.aborted) return;
    if (reported.has(error)) return;
    reported.add(error);
    const failedStage = machine.isStaging() || (!busy && machine.current().status === 'downloaded') ? 'install' : stage;
    const denied = updateAuthorizationDenied(error) && attemptedVersion !== undefined;
    const alreadyPaused = refusedVersion === attemptedVersion;
    if (denied && attemptedVersion) {
      pauseAuthorization(attemptedVersion);
      updater.autoInstallOnAppQuit = false;
    }
    logger.warn('update failed', { stage: failedStage, error });
    if (!denied || !alreadyPaused) report(failedStage, error);
    machine.failed(denied ? 'UPDATE_AUTHORIZATION_DENIED' : isDiskFull(error) ? 'ENOSPC' : error.message.split('\n')[0] ?? error.message, denied ? 'install' : failedStage);
  };
  const onError = (error: Error): void => {
    if (attempting) attemptError = error;
    else failure(error);
  };
  const checking = (): void => machine.checking();
  const available = (info: { version: string }): void => {
    if (canAttempt(info.version)) machine.available(info.version);
  };
  const upToDate = (): void => {
    if (checkRequested && refusedVersion) {
      pauseAuthorization(null);
      updater.autoInstallOnAppQuit = true;
    }
    if (!refusedVersion || checkRequested) machine.upToDate();
  };
  const progress = (info: { percent: number }): void => machine.downloading(Math.round(info.percent));
  const downloaded = (info: { version: string }): void => {
    logger.info('downloaded', { version: info.version });
    stage = 'install';
    machine.downloaded(info.version);
  };
  const staged = (): void => {
    logger.info('prepared for install', { version: machine.current().version });
    const prepared = machine.current().status === 'downloaded';
    machine.nativeStaged();
    if (prepared) pauseAuthorization(null);
  };
  const retryServerErrors = async <Result>(run: () => Promise<Result>): Promise<Result> => {
    for (let attempt = 0; ; attempt += 1) {
      attempting = true;
      attemptError = undefined;
      try {
        const result = await run();
        if (attemptError) throw attemptError;
        return result;
      } catch (error) {
        const status = updateHttpStatus(error);
        if (status === undefined || status < 500 || status > 599 || attempt >= 2) throw error;
      } finally {
        attempting = false;
      }
      await wait(1000 * 2 ** attempt, lifetime.signal);
      lifetime.signal.throwIfAborted();
    }
  };

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = !refusedVersion;
  if (refusedVersion) machine.failed('UPDATE_AUTHORIZATION_DENIED', 'install');
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
        if (requested) {
          checkRequested = true;
          machine.claimCheck();
        }
        return;
      }
      if (machine.isStaging() || machine.current().restarting) return;
      updater.autoInstallOnAppQuit = !refusedVersion;
      busy = true;
      checkRequested = requested;
      stage = 'check';
      const prior = machine.current();
      const stagedVersion = prior.status === 'downloaded' ? prior.version : undefined;
      if (requested) machine.requestCheck();
      try {
        const result = await retryServerErrors(() => updater.checkForUpdates());
        if (lifetime.signal.aborted) return;
        if (result && !result.isUpdateAvailable && checkRequested && refusedVersion) upToDate();
        if (result?.isUpdateAvailable && canAttempt(result.updateInfo.version) && (!stagedVersion || gt(result.updateInfo.version, stagedVersion))) {
          attemptedVersion = result.updateInfo.version;
          updater.autoInstallOnAppQuit = true;
          stage = 'download';
          await retryServerErrors(() => updater.downloadUpdate());
        }
      } catch (error) {
        failure(error instanceof Error ? error : new Error(String(error)));
      } finally {
        busy = false;
        checkRequested = false;
        const current = machine.current();
        if (!lifetime.signal.aborted && refusedVersion && current.status !== 'downloaded' && current.status !== 'error') {
          machine.failed('UPDATE_AUTHORIZATION_DENIED', 'install');
        }
        if (!lifetime.signal.aborted) machine.checkFinished();
      }
    },
    restart(): void {
      if (!machine.canRestart()) return;
      if (!busy && !machine.isStaging()) void session.check();
      machine.restart(() => {
        try {
          updater.quitAndInstall();
        } catch (error) {
          failure(error instanceof Error ? error : new Error(String(error)));
        }
      });
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

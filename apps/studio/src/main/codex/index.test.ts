import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import type { CodexSetupState } from '@studio/events';
import { settle } from '@studio/fixtures';

import { codexSetupStatus, prepareCodexForSession, registerCodexHost, startCodexBootPreCheck } from './index.js';
import type { DownloadProgress } from './acquire.js';
import type { LoginHandle, LoginOutcome } from './login.js';
import { CODEX_VERSION, codexInstallRoot } from './paths.js';
import { configureLogExport, flushLog, peekLinesForTesting, recordLinesForTesting, resetLogForTesting } from '../log/index.js';
import type { ValidationResult } from './validate.js';

const KEYS = ['STUDIO_CODEX_CACHE_ROOT', 'STUDIO_CODEX_SETUP', 'STUDIO_CODEX_ROOT'] as const;
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const before = saved[key];
    if (before === undefined) delete process.env[key];
    else process.env[key] = before;
  }
});

describe('Codex setup operation ownership', () => {
  it('reserves login authority while joining an older installation validation', async () => {
    await emptyCacheRoot();
    const validating = Promise.withResolvers<void>();
    const validation = Promise.withResolvers<void>();
    const completion = Promise.withResolvers<LoginOutcome>();
    const opening = Promise.withResolvers<void>();
    let starts = 0;
    let validations = 0;
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      acquire: async () => {
        const root = codexInstallRoot();
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => {
        validations += 1;
        if (validations === 1) {
          validating.resolve();
          await validation.promise;
          return { outcome: 'ok', message: 'old account', email: 'old@example.test' };
        }
        return { outcome: 'ok', message: 'new account', email: 'new@example.test' };
      },
      startLogin: async () => {
        starts += 1;
        return { authUrl: 'https://example.test/auth', loginId: 'fixture', completed: completion.promise, cancel: async () => {} };
      },
      openExternal: async () => { opening.resolve(); },
    });
    host.install();
    const installation = host.preCheck();
    await validating.promise;
    expect(host.signIn()).toEqual({ accepted: true });
    const starting = host.current();
    const startsBeforePreparation = starts;
    const afterSignIn = emitted.length;
    validation.resolve();
    await installation;
    await opening.promise;
    const afterPreparation = host.current();
    const staleVerdicts = emitted.slice(afterSignIn).filter((state) => state.status === 'ready');
    completion.resolve({ success: true });
    await settle();
    expect(starting).toStrictEqual({ status: 'signing-in' });
    expect(startsBeforePreparation).toBe(0);
    expect(starts).toBe(1);
    expect(staleVerdicts).toStrictEqual([]);
    expect(afterPreparation).toStrictEqual({ status: 'signing-in', authUrl: 'https://example.test/auth' });
    expect(host.current()).toStrictEqual({ status: 'ready', email: 'new@example.test' });
  });

  it('starts no installation or pre-check validation over an active login, and keeps neither caller waiting for it', async () => {
    await emptyCacheRoot();
    await cachedInstall(CODEX_VERSION);
    const completion = Promise.withResolvers<LoginOutcome>();
    const opening = Promise.withResolvers<void>();
    let acquisitions = 0;
    let validations = 0;
    const host = registerCodexHost({
      acquire: async () => { acquisitions += 1; throw new Error('must join login'); },
      startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: completion.promise, cancel: async () => {} }),
      openExternal: async () => { opening.resolve(); },
      validate: async () => {
        validations += 1;
        return { outcome: 'ok', message: 'connected', email: 'new@example.test' };
      },
    });
    host.signIn();
    await opening.promise;
    expect(host.install()).toEqual({ accepted: true });
    let checked = false;
    const checking = host.preCheck().then(() => { checked = true; });
    await settle();
    const checkedBeforeCompletion = checked;
    const beforeCompletion = host.current();
    const validationsBeforeCompletion = validations;
    completion.resolve({ success: true });
    await checking;
    await settle();
    expect(checkedBeforeCompletion).toBe(true);
    expect(acquisitions).toBe(0);
    expect(validationsBeforeCompletion).toBe(0);
    expect(validations).toBe(1);
    expect(beforeCompletion).toStrictEqual({ status: 'signing-in', authUrl: 'https://example.test/auth' });
    expect(host.current()).toStrictEqual({ status: 'ready', email: 'new@example.test' });
  });

  it('keeps the sign-in sheet standing when a check underneath it answers with an install problem', async () => {
    await emptyCacheRoot();
    await cachedInstall(CODEX_VERSION);
    const checking = Promise.withResolvers<void>();
    const answer = Promise.withResolvers<void>();
    const opening = Promise.withResolvers<void>();
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      validate: async () => {
        checking.resolve();
        await answer.promise;
        return { outcome: 'outdated', message: 'older than the pin', version: '0.156.1' };
      },
      startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: new Promise<LoginOutcome>(() => {}), cancel: async () => {} }),
      openExternal: async () => { opening.resolve(); },
    });
    const silent = host.preCheck();
    await checking.promise;
    host.signIn();
    const whileChecking = host.current();
    answer.resolve();
    await silent;
    // The page opens once the check it waited for is out of the way (ONL-3107).
    await opening.promise;
    await settle();
    expect(whileChecking).toStrictEqual({ status: 'signing-in' });
    expect(host.current()).toStrictEqual({ status: 'signing-in', authUrl: 'https://example.test/auth' });
    expect(emitted.filter((state) => state.status === 'outdated')).toStrictEqual([]);
  });

  it('still holds a session start for the installation it needs, login or no login (ONL-2925)', async () => {
    await emptyCacheRoot();
    const { promise: pending, resolve: finish } = Promise.withResolvers<void>();
    const host = registerCodexHost({
      acquire: async () => {
        await pending;
        const root = await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
      startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: new Promise<LoginOutcome>(() => {}), cancel: async () => {} }),
      openExternal: async () => {},
    });
    host.install();
    host.signIn();
    let prepared = false;
    const session = host.preCheck().then(() => { prepared = true; });
    await settle();
    const preparedDuringInstall = prepared;
    finish();
    await session;
    expect(preparedDuringInstall).toBe(false);
    expect(prepared).toBe(true);
  });

  it('cancels a queued login without publishing old preparation results or blocking a later attempt', async () => {
    for (const phase of ['acquisition', 'validation'] as const) {
      await emptyCacheRoot();
      const preparing = Promise.withResolvers<void>();
      const preparation = Promise.withResolvers<void>();
      let progress: ((next: DownloadProgress) => void) | undefined;
      let starts = 0;
      let validations = 0;
      const emitted: CodexSetupState[] = [];
      const host = registerCodexHost({
        onState: (state) => emitted.push(state),
        acquire: async ({ onProgress }) => {
          progress = onProgress;
          if (phase === 'acquisition') {
            preparing.resolve();
            await preparation.promise;
          }
          const root = codexInstallRoot();
          return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
        },
        validate: async () => {
          validations += 1;
          if (phase === 'validation' && validations === 1) {
            preparing.resolve();
            await preparation.promise;
            return { outcome: 'ok', message: 'old account', email: 'old@example.test' };
          }
          return { outcome: 'ok', message: 'new account', email: 'new@example.test' };
        },
        startLogin: async () => {
          starts += 1;
          return { authUrl: 'https://example.test/auth', loginId: 'fixture', completed: Promise.resolve({ success: true }), cancel: async () => {} };
        },
        openExternal: async () => {},
      });
      host.install();
      const installation = host.preCheck();
      await preparing.promise;
      host.signIn();
      await host.cancelSignIn();
      const cancelled = host.current();
      const afterCancel = emitted.length;
      host.signIn();
      progress?.({ receivedBytes: 50, totalBytes: 100 });
      preparation.resolve();
      await installation;
      await settle();
      const afterPreparation = host.current();
      const afterPreparationCount = emitted.length;
      const startsBeforeRetry = starts;
      host.signIn();
      await settle();
      const afterRetry = emitted.length;
      progress?.({ receivedBytes: 99, totalBytes: 100 });
      expect(cancelled.status).toBe('signed-out');
      expect(afterPreparation).toStrictEqual(cancelled);
      expect(afterPreparationCount).toBe(afterCancel);
      expect(startsBeforeRetry).toBe(0);
      expect(starts).toBe(1);
      expect(validations).toBe(phase === 'acquisition' ? 1 : 2);
      expect(host.current()).toStrictEqual({ status: 'ready', email: 'new@example.test' });
      expect(emitted).toHaveLength(afterRetry);
    }
  });

  it('ignores a first download callback that arrives only after ready', async () => {
    await emptyCacheRoot();
    let progress: ((next: DownloadProgress) => void) | undefined;
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      acquire: async ({ onProgress }) => {
        progress = onProgress;
        const root = codexInstallRoot();
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'connected' }),
    });
    host.install();
    await host.preCheck();
    const before = emitted.length;
    progress?.({ receivedBytes: 1, totalBytes: 100 });
    expect(host.current()).toStrictEqual({ status: 'ready' });
    expect(emitted).toHaveLength(before);
  });

  it('ignores the first download callback after acquisition enters validation and after ready', async () => {
    await emptyCacheRoot();
    const validating = Promise.withResolvers<void>();
    const validation = Promise.withResolvers<void>();
    let progress: ((next: DownloadProgress) => void) | undefined;
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      acquire: async ({ onProgress }) => {
        progress = onProgress;
        const root = codexInstallRoot();
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => {
        validating.resolve();
        await validation.promise;
        return { outcome: 'ok', message: 'connected', email: 'designer@example.test' };
      },
    });
    host.install();
    const joined = host.preCheck();
    await validating.promise;
    const before = emitted.length;
    progress?.({ receivedBytes: 1, totalBytes: 100 });
    const duringValidation = host.current();
    const duringValidationCount = emitted.length;
    validation.resolve();
    await joined;
    const after = emitted.length;
    progress?.({ receivedBytes: 99, totalBytes: 100 });
    expect(duringValidation).toStrictEqual({ status: 'validating' });
    expect(duringValidationCount).toBe(before);
    expect(host.current()).toStrictEqual({ status: 'ready', email: 'designer@example.test' });
    expect(emitted).toHaveLength(after);
  });

  it('ignores old download callbacks after failure and during a replacement acquisition', async () => {
    await emptyCacheRoot();
    const replacement = Promise.withResolvers<void>();
    const callbacks: Array<((next: DownloadProgress) => void) | undefined> = [];
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      acquire: async ({ onProgress }) => {
        callbacks.push(onProgress);
        if (callbacks.length === 1) return { outcome: 'failed', failure: 'download', message: 'offline' };
        await replacement.promise;
        const root = codexInstallRoot();
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'connected' }),
    });
    host.install();
    await host.preCheck();
    const failed = host.current();
    const before = emitted.length;
    callbacks[0]?.({ receivedBytes: 10, totalBytes: 100 });
    const afterFailure = host.current();
    const afterFailureCount = emitted.length;
    host.install();
    const joined = host.preCheck();
    callbacks[1]?.({ receivedBytes: 20, totalBytes: 100 });
    const replacementState = host.current();
    const replacementCount = emitted.length;
    callbacks[0]?.({ receivedBytes: 90, totalBytes: 100 });
    const afterOldProgress = host.current();
    const afterOldCount = emitted.length;
    replacement.resolve();
    await joined;
    expect(afterFailure).toStrictEqual(failed);
    expect(afterFailureCount).toBe(before);
    expect(replacementState).toStrictEqual({ status: 'downloading', percent: 20 });
    expect(afterOldProgress).toStrictEqual(replacementState);
    expect(afterOldCount).toBe(replacementCount);
    expect(host.current().status).toBe('ready');
  });

  it('joins installation startup and releases a rejected acquisition for retry', async () => {
    await emptyCacheRoot();
    const acquisition = Promise.withResolvers<never>();
    let acquisitions = 0;
    const host = registerCodexHost({
      acquire: async () => {
        acquisitions += 1;
        if (acquisitions === 1) return acquisition.promise;
        const root = codexInstallRoot();
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'connected' }),
    });
    expect(host.install()).toEqual({ accepted: true });
    expect(host.install()).toEqual({ accepted: true });
    const first = host.preCheck();
    const second = host.preCheck();
    expect(acquisitions).toBe(1);
    acquisition.reject(new Error('acquisition failed'));
    await Promise.all([first, second]);
    expect(host.current().status).toBe('failed');
    host.install();
    await host.preCheck();
    expect(acquisitions).toBe(2);
    expect(host.current().status).toBe('ready');
  });

  it('does not invent an auth URL while a joined login is starting', async () => {
    const startup = Promise.withResolvers<LoginHandle>();
    let starts = 0;
    const host = registerCodexHost({
      startLogin: async () => { starts += 1; return startup.promise; },
      openExternal: async () => {},
    });
    expect(host.signIn()).toEqual({ accepted: true });
    expect(host.signIn()).toEqual({ accepted: true });
    const starting = host.current();
    await host.cancelSignIn();
    startup.resolve({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: Promise.resolve({ success: true }), cancel: async () => {} });
    await settle();
    expect(starts).toBe(1);
    expect(starting).toStrictEqual({ status: 'signing-in' });
    expect(host.current()).toStrictEqual({ status: 'signed-out' });
  });

  it('cancels an eventual startup handle without opening a browser or validating it', async () => {
    const startup = Promise.withResolvers<LoginHandle>();
    let cancellations = 0;
    let opens = 0;
    let validations = 0;
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      startLogin: async () => startup.promise,
      openExternal: async () => { opens += 1; },
      validate: async () => { validations += 1; return { outcome: 'ok', message: 'connected' }; },
    });
    host.signIn();
    await host.cancelSignIn();
    const before = emitted.length;
    startup.resolve({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: Promise.resolve({ success: true }), cancel: async () => { cancellations += 1; } });
    await settle();
    expect(cancellations).toBe(1);
    expect(opens).toBe(0);
    expect(validations).toBe(0);
    expect(host.current()).toStrictEqual({ status: 'signed-out' });
    expect(emitted).toHaveLength(before);
  });

  it('ignores startup errors after cancellation and permits a replacement login', async () => {
    const startup = Promise.withResolvers<LoginHandle>();
    const replacement = Promise.withResolvers<LoginHandle>();
    let starts = 0;
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      startLogin: async () => ++starts === 1 ? startup.promise : replacement.promise,
      openExternal: async () => {},
    });
    host.signIn();
    await host.cancelSignIn();
    const before = emitted.length;
    startup.reject(new Error('late startup error'));
    await settle();
    const afterError = host.current();
    const afterErrorCount = emitted.length;
    host.signIn();
    const starting = host.current();
    await host.cancelSignIn();
    replacement.resolve({ authUrl: 'https://example.test/new', loginId: 'replacement', completed: Promise.resolve({ success: true }), cancel: async () => {} });
    await settle();
    expect(afterError).toStrictEqual({ status: 'signed-out' });
    expect(afterErrorCount).toBe(before);
    expect(starts).toBe(2);
    expect(starting).toStrictEqual({ status: 'signing-in' });
  });

  it('ignores browser and completion rejections after active cancellation', async () => {
    for (const phase of ['browser', 'completion'] as const) {
      const browser = Promise.withResolvers<void>();
      const completion = Promise.withResolvers<LoginOutcome>();
      const opening = Promise.withResolvers<void>();
      let cancellations = 0;
      let validations = 0;
      const emitted: CodexSetupState[] = [];
      const host = registerCodexHost({
        onState: (state) => emitted.push(state),
        startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: completion.promise, cancel: async () => { cancellations += 1; } }),
        openExternal: async () => { opening.resolve(); await browser.promise; },
        validate: async () => { validations += 1; return { outcome: 'ok', message: 'connected' }; },
      });
      host.signIn();
      await opening.promise;
      if (phase === 'completion') {
        browser.resolve();
        await settle();
      }
      await host.cancelSignIn();
      const before = emitted.length;
      if (phase === 'browser') {
        browser.reject(new Error('late browser error'));
        completion.resolve({ success: true });
      } else completion.reject(new Error('late completion error'));
      await settle();
      expect(host.current()).toStrictEqual({ status: 'signed-out' });
      expect(emitted).toHaveLength(before);
      expect(cancellations).toBe(1);
      expect(validations).toBe(0);
    }
  });

  it('joins a cancelled active login until its completion settles', async () => {
    const browser = Promise.withResolvers<void>();
    const opening = Promise.withResolvers<void>();
    const completion = Promise.withResolvers<LoginOutcome>();
    let starts = 0;
    const host = registerCodexHost({
      startLogin: async () => {
        starts += 1;
        return { authUrl: 'https://example.test/auth', loginId: 'fixture', completed: completion.promise, cancel: async () => {} };
      },
      openExternal: async () => { opening.resolve(); await browser.promise; },
    });
    host.signIn();
    await opening.promise;
    await host.cancelSignIn();
    browser.resolve();
    await settle();
    host.signIn();
    const startsBeforeCompletion = starts;
    completion.resolve({ success: false });
    await settle();
    host.signIn();
    await settle();
    expect(startsBeforeCompletion).toBe(1);
    expect(starts).toBe(2);
    expect(host.current().status).toBe('signed-out');
  });

  it('keeps validation authoritative when login completed before the sheet is dismissed', async () => {
    const validating = Promise.withResolvers<void>();
    const validation = Promise.withResolvers<void>();
    let cancellations = 0;
    const host = registerCodexHost({
      startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: Promise.resolve({ success: true }), cancel: async () => { cancellations += 1; } }),
      openExternal: async () => {},
      validate: async () => {
        validating.resolve();
        await validation.promise;
        return { outcome: 'ok', message: 'connected', email: 'designer@example.test', plan: 'plus' };
      },
    });
    host.signIn();
    await validating.promise;
    await host.cancelSignIn();
    const duringValidation = host.current();
    validation.resolve();
    await settle();
    expect(cancellations).toBe(0);
    expect(duringValidation).toStrictEqual({ status: 'validating' });
    expect(host.current()).toStrictEqual({ status: 'ready', email: 'designer@example.test', plan: 'plus' });
  });
});

describe('Codex validation recovery', () => {
  const cases: Array<{ result: ValidationResult & { outcome: 'failed' | 'broken' }; copy: string; redownload: boolean }> = [
    { result: { outcome: 'failed', failure: 'exited', exitCode: 1, signal: null, message: 'synthetic startup detail' }, copy: 'stopped before setup finished', redownload: false },
    { result: { outcome: 'broken', failure: 'exited', exitCode: null, signal: 'SIGSEGV', message: 'synthetic startup detail' }, copy: 'Download it again', redownload: true },
    { result: { outcome: 'failed', failure: 'connection', message: 'synthetic startup detail' }, copy: 'Could not connect', redownload: false },
    { result: { outcome: 'failed', failure: 'timeout', message: 'synthetic startup detail' }, copy: 'took too long', redownload: false },
  ];

  for (const { result, copy, redownload } of cases) {
    it(`shows recovery guidance for ${result.failure} (${result.outcome}) and ${redownload ? 'replaces' : 'reuses'} the download on retry`, async () => {
      await emptyCacheRoot();
      await cachedInstall(CODEX_VERSION);
      const forces: boolean[] = [];
      let validations = 0;
      const host = registerCodexHost({
        acquire: async ({ force }) => {
          forces.push(force ?? false);
          const root = codexInstallRoot();
          return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: force ?? false };
        },
        validate: async () => ++validations === 1 ? result : { outcome: 'ok', message: 'connected' },
      });
      await host.preCheck();
      const state = host.current();
      expect(state.status).toBe(result.outcome);
      expect(state.message).toContain(copy);
      expect(state.message).not.toContain(result.message);
      host.install();
      await host.preCheck();
      expect(forces).toEqual([redownload]);
      expect(host.current().status).toBe('ready');
    });

    it(`exports only safe ${result.failure} (${result.outcome}) diagnostics while retaining local detail`, async () => {
      await emptyCacheRoot();
      await cachedInstall(CODEX_VERSION);
      const fetchBefore = globalThis.fetch;
      const payloads: string[] = [];
      resetLogForTesting();
      recordLinesForTesting();
      globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        payloads.push(String(init?.body));
        return new Response('{}');
      }) as typeof fetch;
      configureLogExport({ key: 'phc_test', host: 'https://ingest.example.test' });
      try {
        const host = registerCodexHost({ validate: async () => result });
        await host.preCheck();
        await flushLog();
        const row = peekLinesForTesting().find((line) => line.msg === `validation ${result.outcome}`);
        expect(row).toMatchObject({ failure: result.failure, stderr: result.message });
        const exported = payloads.join('');
        expect(exported).toContain(result.failure!);
        expect(exported).not.toContain(result.message);
        expect(exported).not.toContain('stderr');
        if (result.failure === 'exited') {
          expect(row).toMatchObject({ exitCode: result.exitCode, signal: result.signal });
          expect(exported).toContain('exitCode');
          expect(exported).toContain('signal');
        }
      } finally {
        resetLogForTesting();
        globalThis.fetch = fetchBefore;
      }
    });
  }
});

async function emptyCacheRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'studio-codex-precheck-'));
  process.env['STUDIO_CODEX_CACHE_ROOT'] = root;
  return root;
}

async function cachedInstall(version: string): Promise<string> {
  const root = codexInstallRoot(version);
  await mkdir(root, { recursive: true });
  for (const name of ['codex', 'codex-code-mode-host']) {
    const binary = join(root, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
    await writeFile(binary, '#!/bin/sh\nexit 0\n');
    await chmod(binary, 0o755);
  }
  return root;
}

describe('Codex readiness after its copy disappears (ONL-3177)', () => {
  it('preserves pinned setup states even after a validated copy disappears', async () => {
    await emptyCacheRoot();
    const root = await cachedInstall(CODEX_VERSION);
    const host = registerCodexHost({ validate: async () => ({ outcome: 'ok', message: 'signed in' }) });
    await host.preCheck();
    await rm(root, { recursive: true, force: true });
    process.env['STUDIO_CODEX_SETUP'] = 'ready';
    host.install();
    await host.preCheck();
    expect(host.current().status).toBe('ready');
    delete process.env['STUDIO_CODEX_SETUP'];
    await host.preCheck();
    expect(host.current().status).toBe('idle');
  });

  it('leaves an active login in charge after its ready copy disappears', async () => {
    await emptyCacheRoot();
    const root = await cachedInstall(CODEX_VERSION);
    const opening = Promise.withResolvers<void>();
    const completion = Promise.withResolvers<LoginOutcome>();
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
      acquire: async () => { throw new Error('login owns setup'); },
      startLogin: async () => ({ authUrl: 'https://example.test/auth', loginId: 'fixture', completed: completion.promise, cancel: async () => { completion.resolve({ success: false }); } }),
      openExternal: async () => { opening.resolve(); },
    });
    await host.preCheck();
    host.signIn();
    await opening.promise;
    await rm(root, { recursive: true, force: true });
    const before = emitted.length;
    host.install();
    await host.preCheck();
    expect(emitted).toHaveLength(before);
    expect(host.current().status).toBe('signing-in');
    await host.cancelSignIn();
    await settle();
  });

  it('joins a live acquisition after the ready copy disappears', async () => {
    await emptyCacheRoot();
    const root = await cachedInstall(CODEX_VERSION);
    const acquisition = Promise.withResolvers<void>();
    let installs = 0;
    const emitted: CodexSetupState[] = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      acquire: async () => {
        installs += 1;
        await acquisition.promise;
        await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    await host.preCheck();
    await rm(root, { recursive: true, force: true });
    host.install();
    const before = emitted.length;
    host.install();
    let prepared = false;
    const joining = host.preCheck().then(() => { prepared = true; });
    await settle();
    expect(prepared).toBe(false);
    expect(host.current().status).toBe('checking');
    expect(emitted).toHaveLength(before);
    acquisition.resolve();
    await joining;
    expect(installs).toBe(1);
    expect(host.current().status).toBe('ready');
  });

  it('reinstalls on Set up after ready without forcing a replacement', async () => {
    await emptyCacheRoot();
    const root = await cachedInstall(CODEX_VERSION);
    const emitted: CodexSetupState[] = [];
    const forces: Array<boolean | undefined> = [];
    const host = registerCodexHost({
      onState: (state) => emitted.push(state),
      acquire: async (options) => {
        forces.push(options.force);
        await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    await host.preCheck();
    expect(host.current().status).toBe('ready');
    emitted.length = 0;
    await rm(root, { recursive: true, force: true });
    expect(host.install()).toEqual({ accepted: true });
    await host.preCheck();
    expect(forces).toEqual([false]);
    expect(emitted.map((state) => state.status)).toEqual(['idle', 'checking', 'validating', 'ready']);
    expect(host.current().status).toBe('ready');
  });

  it('keeps a healthy ready copy without acquiring or validating again', async () => {
    await emptyCacheRoot();
    await cachedInstall(CODEX_VERSION);
    let acquisitions = 0;
    let validations = 0;
    const host = registerCodexHost({
      acquire: async () => { acquisitions += 1; throw new Error('unexpected acquisition'); },
      validate: async () => { validations += 1; return { outcome: 'ok', message: 'signed in' }; },
    });
    await host.preCheck();
    host.install();
    await host.preCheck();
    expect(host.current().status).toBe('ready');
    expect(acquisitions).toBe(0);
    expect(validations).toBe(1);
  });

  it('revokes ready but waits for Set up when no previous install remains', async () => {
    await emptyCacheRoot();
    const root = await cachedInstall(CODEX_VERSION);
    let acquisitions = 0;
    const host = registerCodexHost({
      acquire: async () => { acquisitions += 1; throw new Error('requires consent'); },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    await host.preCheck();
    expect(host.current().status).toBe('ready');
    await rm(root, { recursive: true, force: true });
    await host.preCheck();
    expect(host.current().status).toBe('idle');
    expect(acquisitions).toBe(0);
  });

  it('reacquires silently after ready when an older healthy install remains', async () => {
    await emptyCacheRoot();
    const root = await cachedInstall(CODEX_VERSION);
    await cachedInstall('0.156.1');
    const forces: Array<boolean | undefined> = [];
    const host = registerCodexHost({
      acquire: async (options) => {
        forces.push(options.force);
        await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    await host.preCheck();
    await rm(root, { recursive: true, force: true });
    await host.preCheck();
    expect(forces).toEqual([false]);
    expect(host.current().status).toBe('ready');
  });
});

describe('the codex boot pre-check', () => {
  it('keeps replacement intent when a forced download fails and Try again retries it', async () => {
    for (const status of ['broken', 'outdated'] as const) {
      await emptyCacheRoot();
      await cachedInstall(CODEX_VERSION);
      const forces: Array<boolean | undefined> = [];
      let validations = 0;
      const host = registerCodexHost({
        acquire: async (options) => {
          forces.push(options.force);
          if (forces.length === 1) return { outcome: 'failed', failure: 'metadata', message: 'offline' };
          const root = codexInstallRoot();
          return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
        },
        validate: async () => ++validations === 1
          ? { outcome: status, message: 'needs replacement', failure: 'unusable' }
          : { outcome: 'ok', message: 'signed in' },
      });
      await host.preCheck();
      host.install();
      await host.preCheck();
      expect(host.current().status).toBe('failed');
      host.install();
      await host.preCheck();
      expect(forces).toEqual([true, true]);
      expect(host.current().status).toBe('ready');
    }
  });

  it('does not spend held replacement intent on a healthy install the next pre-check validates (ONL-3107)', async () => {
    await emptyCacheRoot();
    await cachedInstall(CODEX_VERSION);
    const forces: Array<boolean | undefined> = [];
    let validations = 0;
    const host = registerCodexHost({
      acquire: async (options) => {
        forces.push(options.force);
        return { outcome: 'failed', failure: 'metadata', message: 'offline' };
      },
      validate: async () => ++validations === 1
        ? { outcome: 'broken', message: 'needs replacement', failure: 'unusable' }
        : { outcome: 'ok', message: 'signed in' },
    });
    await host.preCheck();
    host.install();
    await host.preCheck();
    expect(forces).toEqual([true]);
    expect(host.current().status).toBe('failed');
    await host.preCheck();
    expect(forces).toEqual([true]);
    expect(validations).toBe(2);
    expect(host.current().status).toBe('ready');
  });

  it('leaves a held replacement to the next tap instead of downloading at launch (ONL-3107)', async () => {
    await emptyCacheRoot();
    await cachedInstall('0.156.1');
    const pinned = await cachedInstall(CODEX_VERSION);
    const forces: Array<boolean | undefined> = [];
    const host = registerCodexHost({
      acquire: async (options) => {
        forces.push(options.force);
        return { outcome: 'failed', failure: 'metadata', message: 'offline' };
      },
      validate: async () => ({ outcome: 'broken', message: 'needs replacement', failure: 'unusable' }),
    });
    await host.preCheck();
    expect(host.current().status).toBe('broken');
    host.install();
    await host.preCheck();
    expect(forces).toEqual([true]);
    // The replacement the user asked for failed and took the pinned install with it; the next launch checks on its own.
    await rm(pinned, { recursive: true, force: true });
    await host.preCheck();
    expect(forces).toEqual([true, false]);
  });

  it('forces a fresh download from broken and outdated, but not a normal launch', async () => {
    for (const status of ['broken', 'outdated'] as const) {
      await emptyCacheRoot();
      await cachedInstall(CODEX_VERSION);
      const forces: Array<boolean | undefined> = [];
      let validations = 0;
      const host = registerCodexHost({
        acquire: async (options) => {
          forces.push(options.force);
          const root = codexInstallRoot();
          return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: options.force === true };
        },
        validate: async () => ++validations === 1
          ? { outcome: status, message: 'needs replacement', failure: 'unusable' }
          : { outcome: 'ok', message: 'signed in' },
      });
      await host.preCheck();
      expect(host.current().status).toBe(status);
      host.install();
      await host.preCheck();
      expect(forces).toEqual([true]);
      expect(host.current().status).toBe('ready');
    }
  });

  it('does not offer Download again for a startup environment failure', async () => {
    await emptyCacheRoot();
    await cachedInstall(CODEX_VERSION);
    const host = registerCodexHost({
      validate: async () => ({ outcome: 'failed', failure: 'home', message: 'private path' }),
    });
    await host.preCheck();
    expect(host.current().status).toBe('failed');
    expect(host.current().message).toContain('CODEX_HOME');
    expect(host.current().message).not.toContain('private path');
  });

  it('upgrades an existing installation after the pin changes and joins concurrent project opens', async () => {
    await emptyCacheRoot();
    const oldRoot = await cachedInstall('0.156.1');
    let acquisitions = 0;
    const { promise: pending, resolve: finish } = Promise.withResolvers<void>();
    const host = registerCodexHost({
      acquire: async () => {
        acquisitions += 1;
        await pending;
        const root = await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async ({ root }) => {
        expect(root).toBe(codexInstallRoot());
        return { outcome: 'ok', message: 'signed in', email: 'designer@example.test' };
      },
    });

    const boot = host.preCheck();
    expect(host.install().accepted).toBe(true);
    let opened = false;
    const project = host.preCheck().then(() => { opened = true; });
    await Promise.resolve();
    expect(acquisitions).toBe(1);
    expect(opened).toBe(false);
    finish();
    await Promise.all([boot, project]);
    expect(host.current()).toMatchObject({ status: 'ready', email: 'designer@example.test' });
    expect(existsSync(oldRoot)).toBe(true);
  });

  it('reuses the current pin without acquiring it again', async () => {
    await emptyCacheRoot();
    await cachedInstall(CODEX_VERSION);
    let acquired = false;
    const host = registerCodexHost({
      acquire: async () => { acquired = true; throw new Error('must not download'); },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    await host.preCheck();
    expect(host.current().status).toBe('ready');
    expect(acquired).toBe(false);
  });

  it('does not make an explicit runtime wait for managed cache preparation', async () => {
    await emptyCacheRoot();
    const oldRoot = await cachedInstall('0.156.1');
    const { promise: pending, resolve: finish } = Promise.withResolvers<void>();
    const host = registerCodexHost({
      acquire: async () => {
        await pending;
        const root = await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    const boot = host.preCheck();
    process.env['STUDIO_CODEX_ROOT'] = oldRoot;
    let prepared = false;
    const session = prepareCodexForSession().then(() => { prepared = true; });
    await Promise.resolve();
    try {
      expect(prepared).toBe(true);
      expect(host.current().status).toBe('checking');
    } finally {
      finish();
      await Promise.all([boot, session]);
    }
  });

  it('does not infer setup consent from an incomplete old install or unrelated cache directory', async () => {
    const root = await emptyCacheRoot();
    await mkdir(codexInstallRoot('0.156.1'));
    await cachedInstall('unrelated');
    let acquired = false;
    const host = registerCodexHost({
      acquire: async () => { acquired = true; throw new Error('must not download'); },
    });
    await host.preCheck();
    expect(host.current().status).toBe('idle');
    expect(acquired).toBe(false);
    expect(existsSync(codexInstallRoot(undefined, root))).toBe(false);
  });

  it('keeps the old install after an offline upgrade and lets an explicit retry recover', async () => {
    await emptyCacheRoot();
    const oldRoot = await cachedInstall('0.156.1');
    let acquisitions = 0;
    const host = registerCodexHost({
      acquire: async () => {
        acquisitions += 1;
        if (acquisitions === 1) return { outcome: 'failed', failure: 'metadata', message: 'offline' };
        const root = await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'ok', message: 'signed in' }),
    });
    await host.preCheck();
    expect(host.current().status).toBe('failed');
    expect(existsSync(oldRoot)).toBe(true);
    expect(host.install().accepted).toBe(true);
    await host.preCheck();
    expect(host.current().status).toBe('ready');
    expect(acquisitions).toBe(2);
  });

  it('does not start a login when the upgraded runtime reports signed out', async () => {
    await emptyCacheRoot();
    await cachedInstall('0.156.1');
    let loginStarted = false;
    const host = registerCodexHost({
      acquire: async () => {
        const root = await cachedInstall(CODEX_VERSION);
        return { outcome: 'ok', root, bin: join(root, 'codex'), downloaded: true };
      },
      validate: async () => ({ outcome: 'signed-out', message: 'sign in required' }),
      startLogin: async () => { loginStarted = true; throw new Error('must not sign in'); },
    });
    await host.preCheck();
    expect(host.current().status).toBe('signed-out');
    expect(loginStarted).toBe(false);
  });

  it('leaves an absent codex alone: idle, and NOT downloaded', async () => {
    await emptyCacheRoot();
    registerCodexHost();

    startCodexBootPreCheck();
    await Promise.resolve();

    expect(codexSetupStatus()).toBe('idle');
    expect(existsSync(codexInstallRoot())).toBe(false);
  });
});

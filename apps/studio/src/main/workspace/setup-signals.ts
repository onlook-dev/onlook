// Declared apart from the agent host so the setup machine's import graph never reaches the SDK module (ONL-2179).

import type { BrowserNode } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { log } from '../log/index.js';
import { t } from '@studio/i18n';
import type { CancelToken } from './cancel.js';

export type FirstFrameAnswer =
  | { kind: 'placed'; node: BrowserNode }
  | { kind: 'already-shown'; node: BrowserNode }
  | { kind: 'not-placed'; reason: string }
  | { kind: 'no-setup' };

const logger = log('workspace');

export type StartOutcome =
  | { kind: 'reported'; port: number; frame: FirstFrameAnswer }
  | { kind: 'turn-ended' }
  | { kind: 'canceled' };

export type FirstFramePlacer = (port: number, signal?: AbortSignal) => Promise<FirstFrameAnswer>;

interface StartWaiter {
  resolve(outcome: StartOutcome): void;
  place: FirstFramePlacer;
}

interface SetupRecord {
  parked: number;
  streaming: boolean;
  isOpen: boolean;
  waiters: Set<StartWaiter>;
  idle: Set<() => void>;
  opening: Set<() => void>;
}

const records = new Map<string, SetupRecord>();

function recordFor(cwd: string): SetupRecord {
  const key = canonicalPath(cwd);
  let record = records.get(key);
  if (record === undefined) {
    record = { parked: 0, streaming: false, isOpen: false, waiters: new Set(), idle: new Set(), opening: new Set() };
    records.set(key, record);
  }
  return record;
}

function settle(record: SetupRecord, outcome: StartOutcome): void {
  const waiters = [...record.waiters];
  record.waiters.clear();
  for (const waiter of waiters) waiter.resolve(outcome);
}

// Placed here, not by the machine after it wakes: the agent's tool result waits on this, and the machine may be waiting on that turn to end (ONL-2424).
export async function noteSetupReport(cwd: string, port: number, signal?: AbortSignal): Promise<FirstFrameAnswer> {
  if (signal?.aborted) return { kind: 'not-placed', reason: t('projectSetup.failure.canceled') };
  const record = recordFor(cwd);
  const waiters = [...record.waiters];
  const first = waiters[0];
  if (first === undefined) return { kind: 'no-setup' };
  record.waiters.clear();
  let frame: FirstFrameAnswer;
  try {
    frame = await first.place(port, signal);
  } catch (err) {
    logger.warn('first frame not authored', { error: err });
    frame = { kind: 'not-placed', reason: 'Onlook hit an error placing it' };
  }
  for (const waiter of waiters) waiter.resolve({ kind: 'reported', port, frame });
  return frame;
}

export function noteSetupStreaming(cwd: string, isStreaming: boolean): void {
  const record = recordFor(cwd);
  record.streaming = isStreaming;
  if (isStreaming) return;
  const idle = [...record.idle];
  record.idle.clear();
  for (const waiter of idle) waiter();
  // A parked permission or question is not a turn end: the agent may still report once answered.
  if (record.parked > 0) return;
  settle(record, { kind: 'turn-ended' });
}

export function noteSetupParked(cwd: string, delta: 1 | -1): void {
  const record = recordFor(cwd);
  record.parked = Math.max(0, record.parked + delta);
}

export function isSessionStreaming(cwd: string): boolean {
  return recordFor(cwd).streaming;
}

export function awaitSessionIdle(cwd: string, token: CancelToken): Promise<'idle' | 'canceled'> {
  const record = recordFor(cwd);
  if (token.canceled) return Promise.resolve('canceled');
  if (!record.streaming) return Promise.resolve('idle');
  return new Promise((resolve) => {
    const waiter = (): void => {
      resolve('idle');
    };
    record.idle.add(waiter);
    void token.whenCanceled.then(() => {
      if (record.idle.delete(waiter)) resolve('canceled');
    });
  });
}

export type ProjectOpenOutcome = 'open' | 'canceled' | 'timed-out';

export function noteProjectOpen(cwd: string): void {
  const record = recordFor(cwd);
  record.isOpen = true;
  const opening = [...record.opening];
  record.opening.clear();
  for (const waiter of opening) waiter();
}

export function awaitProjectOpen(cwd: string, token: CancelToken, boundMs: number): Promise<ProjectOpenOutcome> {
  const record = recordFor(cwd);
  if (token.canceled) return Promise.resolve('canceled');
  if (record.isOpen) return Promise.resolve('open');
  return new Promise((resolve) => {
    const finish = (outcome: ProjectOpenOutcome): void => {
      if (!record.opening.delete(waiter)) return;
      clearTimeout(timer);
      resolve(outcome);
    };
    const waiter = (): void => {
      clearTimeout(timer);
      resolve('open');
    };
    const timer = setTimeout(() => finish('timed-out'), boundMs);
    record.opening.add(waiter);
    void token.whenCanceled.then(() => finish('canceled'));
  });
}

export function awaitStartOutcome(
  cwd: string,
  token: CancelToken,
  place: FirstFramePlacer,
): Promise<StartOutcome> {
  const record = recordFor(cwd);
  if (token.canceled) return Promise.resolve({ kind: 'canceled' });
  return new Promise((resolve) => {
    const waiter: StartWaiter = { resolve, place };
    record.waiters.add(waiter);
    void token.whenCanceled.then(() => {
      if (record.waiters.delete(waiter)) resolve({ kind: 'canceled' });
    });
  });
}

// A record with a waiter stays: dropping it strands the promise the session's end would settle.
export function noteSetupTabClosed(cwd: string): void {
  const key = canonicalPath(cwd);
  const record = records.get(key);
  if (record === undefined || record.waiters.size > 0 || record.idle.size > 0 || record.opening.size > 0) return;
  records.delete(key);
}

export function hasSetupRecord(cwd: string): boolean {
  return records.has(canonicalPath(cwd));
}

export function resetSetupSignals(): void {
  records.clear();
}

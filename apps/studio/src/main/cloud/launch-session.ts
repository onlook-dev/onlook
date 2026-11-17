import type { LaunchSessionResult, SessionEndReason } from './client.js';

interface LaunchSessionDeps {
  timeoutMs?: number;
  check(signal: AbortSignal): Promise<LaunchSessionResult>;
  ended(reason: SessionEndReason): void;
  retry(run: () => void): () => void;
}

type Operation = { kind: 'checking'; abort: AbortController; promise?: Promise<void> };
type Phase = { kind: 'idle' | 'settled' | 'disposed' } | Operation | { kind: 'retry-wait'; cancel?: () => void };

export function createLaunchSessionCheck(deps: LaunchSessionDeps) {
  let phase: Phase = { kind: 'idle' };

  function supersede(next: 'settled' | 'disposed' = 'settled'): void {
    const previous = phase;
    phase = { kind: next };
    if (previous.kind === 'checking') previous.abort.abort();
    if (previous.kind === 'retry-wait') previous.cancel?.();
  }

  async function run(operation: Operation): Promise<void> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let abortDeadline = () => {};
    const deadline = new Promise<LaunchSessionResult>((resolve) => {
      abortDeadline = () => {
        clearTimeout(timeout);
        resolve({ status: 'unavailable' });
      };
      operation.abort.signal.addEventListener('abort', abortDeadline, { once: true });
      timeout = setTimeout(() => { operation.abort.abort(); }, deps.timeoutMs ?? 10_000);
      timeout.unref?.();
    });
    let result: unknown;
    try {
      result = await Promise.race([deps.check(operation.abort.signal), deadline]);
    } catch {
      result = { status: 'unavailable' };
    } finally {
      clearTimeout(timeout);
      operation.abort.signal.removeEventListener('abort', abortDeadline);
    }
    if (phase !== operation) return;
    if (typeof result === 'object' && result !== null && 'status' in result) {
      if (result.status === 'valid') {
        phase = { kind: 'settled' };
        return;
      }
      if (result.status === 'ended' && 'reason' in result && (result.reason === 'expired' || result.reason === 'revoked' || result.reason === 'ended')) {
        phase = { kind: 'settled' };
        deps.ended(result.reason);
        return;
      }
    }
    const waiting: Phase = { kind: 'retry-wait' };
    phase = waiting;
    waiting.cancel = deps.retry(() => {
      if (phase !== waiting) return;
      phase = { kind: 'idle' };
      void start();
    });
  }

  function start(): Promise<void> {
    if (phase.kind === 'checking') return phase.promise ?? Promise.resolve();
    if (phase.kind !== 'idle') return Promise.resolve();
    const operation: Operation = { kind: 'checking', abort: new AbortController() };
    phase = operation;
    operation.promise = run(operation);
    return operation.promise;
  }

  return { start, supersede: () => supersede(), dispose: () => supersede('disposed'), phase: () => phase.kind };
}

import { proofSwitchOn, type ProofSwitch } from '../diagnostics/gate.js';
import type { CoolingDeps } from './cooling.js';

/** Only the waiting is skipped: the sweep it fires is production's, with real candidates, `canCool` and teardown (ONL-2210). */
export interface CoolingProofHook {
  advance(ms: number): void;
  fire(): void;
  restore(): void;
}

type Scope = typeof globalThis & { __studioCoolingProof?: CoolingProofHook };

/** Its own switch: other recipes set `STUDIO_SETUP_PROOF`, and holding their sweeps would silently change each. */
export const COOLING_PROOF_ENV: ProofSwitch = 'STUDIO_COOLING_PROOF';

export function installCoolingProof(cadenceMs: number): Partial<CoolingDeps> {
  if (!proofSwitchOn(COOLING_PROOF_ENV)) return {};

  let offsetMs = 0;
  let isDriven = true;

  /** One handle per sweep in both states: one minted while driven must still cancel the real timer `restore` puts on it, or the sweep fires after teardown. */
  interface Scheduled {
    run: () => void;
    timer?: ReturnType<typeof setTimeout>;
    isCancelled?: true;
  }

  let pending: Scheduled | undefined;

  const real = (scheduled: Scheduled, ms: number): ReturnType<typeof setTimeout> => {
    const timer = setTimeout(() => {
      if (scheduled.isCancelled === true) return;
      if (pending === scheduled) pending = undefined;
      scheduled.run();
    }, ms);
    timer.unref?.();
    return timer;
  };

  (globalThis as Scope).__studioCoolingProof = {
    advance: (ms) => {
      offsetMs += ms;
    },
    fire: () => {
      // Only while driving: after `restore` the hold owns a real timer, and firing it here would run the sweep twice.
      if (!isDriven) return;
      const scheduled = pending;
      if (scheduled === undefined || scheduled.isCancelled === true) return;
      pending = undefined;
      scheduled.run();
    },
    restore: () => {
      // Idempotent: a second call would arm a second timer on the same hold and orphan the first.
      if (!isDriven) return;
      isDriven = false;
      // The offset stays: every `touchedAt` written while driven carries it, and zeroing it blocks cooling for as many real hours as were driven.
      if (pending !== undefined) pending.timer = real(pending, cadenceMs);
    },
  };

  return {
    now: () => performance.now() + offsetMs,
    setTimer: (fn, ms) => {
      const scheduled: Scheduled = { run: fn };
      if (isDriven) {
        pending = scheduled;
        return scheduled;
      }
      scheduled.timer = real(scheduled, ms);
      return scheduled;
    },
    clearTimer: (handle) => {
      const scheduled = handle as Scheduled | undefined;
      if (scheduled === undefined) return;
      scheduled.isCancelled = true;
      if (scheduled.timer !== undefined) clearTimeout(scheduled.timer);
      if (pending === scheduled) pending = undefined;
    },
  };
}

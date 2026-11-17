/** A background tab untouched for this long is holding memory for nobody. */
export const IDLE_COOL_MS = 10 * 60_000;
export const IDLE_TEARDOWN_MS = 60 * 60_000;

export const COOL_SWEEP_MS = 60_000;

export interface CoolingCandidate {
  id: string;
  isCoolable: boolean;
  isActive: boolean;
  /** Mid-turn, holding an approval, or mid-cut — all of them run against live state. */
  isBusy: boolean;
}

export interface CoolingDeps {
  candidates: () => readonly CoolingCandidate[];
  cool: (id: string) => void | Promise<void>;
  teardown?: (id: string) => void | Promise<void>;
  /** `false` keeps the tab warm rather than freeing it (ONL-2210). */
  canCool?: (id: string) => Promise<boolean>;
  onProbeFailed?: (id: string, error: unknown) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface Cooling {
  touch: (id: string) => void;
  forget: (id: string) => void;
  sweep: () => Promise<void>;
  start: () => void;
  dispose: () => void;
}

export function createCooling(deps: CoolingDeps): Cooling {
  // Monotonic: under Date.now() a backward wall-clock jump cools every tab at once.
  const now = deps.now ?? ((): number => performance.now());
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number): unknown => setTimeout(fn, ms));
  const clearTimer =
    deps.clearTimer ?? ((handle: unknown): void => clearTimeout(handle as ReturnType<typeof setTimeout>));

  const touchedAt = new Map<string, number>();
  const generation = new Map<string, number>();
  const cooled = new Set<string>();
  let clock = 0;
  let timer: unknown;
  let isDisposed = false;

  const bump = (id: string): void => {
    clock += 1;
    generation.set(id, clock);
  };

  const touch = (id: string): void => {
    cooled.delete(id);
    touchedAt.set(id, now());
    bump(id);
  };

  const forget = (id: string): void => {
    cooled.delete(id);
    touchedAt.delete(id);
    bump(id);
  };

  const deciding = new Set<string>();

  const stillDue = (id: string, judgedAt: number | undefined): boolean => {
    if (isDisposed) return false;
    if (generation.get(id) !== judgedAt) return false;
    const candidate = deps.candidates().find((entry) => entry.id === id);
    if (candidate === undefined) return false;
    return candidate.isCoolable && !candidate.isActive && !candidate.isBusy;
  };

  const sweep = async (): Promise<void> => {
    if (isDisposed) return;
    const at = now();
    const due: { id: string; judgedAt: number | undefined; teardown: boolean }[] = [];
    for (const candidate of deps.candidates()) {
      // A busy or forward tab counts as touched, so its idle time restarts when it goes quiet.
      if (candidate.isActive || candidate.isBusy) {
        touch(candidate.id);
        continue;
      }
      if (!candidate.isCoolable || deciding.has(candidate.id)) continue;
      const last = touchedAt.get(candidate.id);
      if (last === undefined) {
        touch(candidate.id);
        continue;
      }
      if (at - last < IDLE_COOL_MS) continue;
      const teardown = deps.teardown !== undefined && at - last >= IDLE_TEARDOWN_MS;
      if (cooled.has(candidate.id) && !teardown) continue;
      due.push({ id: candidate.id, judgedAt: generation.get(candidate.id), teardown });
    }
    await Promise.all(
      due.map(async ({ id, judgedAt, teardown }) => {
        deciding.add(id);
        try {
          // Asked here, not in the loop above: only an idle tab earns a session-store read.
          if (deps.canCool !== undefined && !(await deps.canCool(id))) {
            // Not resumable now; its idle time restarts rather than being re-asked every sweep.
            if (!isDisposed) touch(id);
            return;
          }
          // Re-read after the await: the tab may have been touched, gone busy, or closed while it ran (ONL-2210).
          if (!stillDue(id, judgedAt)) return;
          if (teardown) await deps.teardown?.(id);
          else await deps.cool(id);
          if (!stillDue(id, judgedAt)) return;
          if (deps.teardown === undefined || teardown) touchedAt.delete(id);
          else cooled.add(id);
        } catch (error) {
          // A probe that threw says nothing about resumability, and cooling on nothing spends a transcript.
          deps.onProbeFailed?.(id, error);
          if (!isDisposed) touch(id);
        } finally {
          deciding.delete(id);
        }
      }),
    );
  };

  const arm = (): void => {
    const handle = setTimer(() => {
      // Never rejects: every per-tab failure is caught inside, so nothing escapes here.
      void sweep();
      arm();
    }, COOL_SWEEP_MS);
    // `unref` so a pending sweep is never the reason Electron will not quit (`server/monitor.ts`).
    (handle as { unref?: () => void }).unref?.();
    timer = handle;
  };

  return {
    touch,
    forget,
    sweep,
    start: () => {
      if (timer === undefined) arm();
    },
    dispose: () => {
      isDisposed = true;
      touchedAt.clear();
      generation.clear();
      cooled.clear();
      if (timer === undefined) return;
      clearTimer(timer);
      timer = undefined;
    },
  };
}

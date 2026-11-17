import { afterEach, describe, expect, it } from 'bun:test';
import { COOL_SWEEP_MS, IDLE_COOL_MS, createCooling, type CoolingCandidate } from './cooling.js';
import { COOLING_PROOF_ENV, installCoolingProof, type CoolingProofHook } from './cooling-proof.js';

const saved = process.env[COOLING_PROOF_ENV];

afterEach(() => {
  if (saved === undefined) delete process.env[COOLING_PROOF_ENV];
  else process.env[COOLING_PROOF_ENV] = saved;
  delete (globalThis as { __studioCoolingProof?: CoolingProofHook }).__studioCoolingProof;
});

const hook = (): CoolingProofHook => {
  const installed = (globalThis as { __studioCoolingProof?: CoolingProofHook }).__studioCoolingProof;
  if (installed === undefined) throw new Error('the cooling proof hook was not installed');
  return installed;
};

const candidate = (id: string): CoolingCandidate => ({ id, isCoolable: true, isActive: false, isBusy: false });

describe('production is exactly the defaults (ONL-2210)', () => {
  it('installs nothing and seams nothing when the gate is off', () => {
    delete process.env[COOLING_PROOF_ENV];

    expect(installCoolingProof(COOL_SWEEP_MS)).toEqual({});
    expect((globalThis as { __studioCoolingProof?: CoolingProofHook }).__studioCoolingProof).toBeUndefined();
  });

  it('installs nothing for any value but the gate', () => {
    process.env[COOLING_PROOF_ENV] = '0';

    expect(installCoolingProof(COOL_SWEEP_MS)).toEqual({});
  });
});

describe('the idle hour is driven, never faked past (ONL-2210)', () => {
  it('drives the FIRST scheduled sweep, which a global patch installed later cannot reach', async () => {
    process.env[COOLING_PROOF_ENV] = '1';
    const cooled: string[] = [];
    const cooling = createCooling({
      candidates: () => [candidate('t1')],
      cool: (id) => { cooled.push(id); },
      ...installCoolingProof(COOL_SWEEP_MS),
    });

    cooling.start();
    await cooling.sweep();
    hook().advance(IDLE_COOL_MS + 1);
    hook().fire();
    // The fired sweep's decision settles on a microtask.
    await Promise.resolve();
    await Promise.resolve();

    expect(cooled).toEqual(['t1']);
  });

  it('still asks canCool — nothing is faked past the clock', async () => {
    process.env[COOLING_PROOF_ENV] = '1';
    const asked: string[] = [];
    const cooled: string[] = [];
    const cooling = createCooling({
      candidates: () => [candidate('t1')],
      cool: (id) => { cooled.push(id); },
      canCool: async (id) => {
        asked.push(id);
        return false;
      },
      ...installCoolingProof(COOL_SWEEP_MS),
    });

    await cooling.sweep();
    hook().advance(IDLE_COOL_MS + 1);
    await cooling.sweep();

    expect(asked).toEqual(['t1']);
    expect(cooled).toEqual([]);
  });

  it('keeps the clock monotonic across restore, so cooling can still decide afterwards', async () => {
    process.env[COOLING_PROOF_ENV] = '1';
    const seams = installCoolingProof(COOL_SWEEP_MS);
    const cooled: string[] = [];
    const cooling = createCooling({ candidates: () => [candidate('t1')], cool: (id) => { cooled.push(id); }, ...seams });

    await cooling.sweep();
    hook().advance(IDLE_COOL_MS + 1);
    const driven = seams.now?.() ?? 0;
    hook().restore();

    expect(seams.now?.() ?? 0).toBeGreaterThanOrEqual(driven);

    hook().advance(IDLE_COOL_MS + 1);
    await cooling.sweep();

    expect(cooled).toEqual(['t1']);
  });

  // A real wait past the cadence: asserting synchronously passes with or without the bug.
  it('a disposed sweep never fires, even after restore put it on a real timer', async () => {
    process.env[COOLING_PROOF_ENV] = '1';
    const cadenceMs = 10;
    const seams = installCoolingProof(cadenceMs);
    let runs = 0;
    const handle = seams.setTimer?.(() => {
      runs += 1;
    }, cadenceMs);

    hook().restore();
    seams.clearTimer?.(handle);
    await new Promise((resolve) => setTimeout(resolve, cadenceMs * 6));

    expect(runs).toBe(0);
  });

  it('a sweep restored and NOT disposed still fires, so the cadence really resumes', async () => {
    process.env[COOLING_PROOF_ENV] = '1';
    const cadenceMs = 10;
    const seams = installCoolingProof(cadenceMs);
    let runs = 0;
    seams.setTimer?.(() => {
      runs += 1;
    }, cadenceMs);

    hook().restore();
    await new Promise((resolve) => setTimeout(resolve, cadenceMs * 6));

    expect(runs).toBe(1);
  });
});

describe('restore leaves one sweep chain (ONL-2210)', () => {
  const cadenceMs = 10;

  const wired = (): { sweeps: () => number; cooling: ReturnType<typeof createCooling> } => {
    process.env[COOLING_PROOF_ENV] = '1';
    let sweeps = 0;
    const cooling = createCooling({
      candidates: () => {
        sweeps += 1;
        return [];
      },
      cool: () => undefined,
      ...installCoolingProof(cadenceMs),
    });
    return { sweeps: () => sweeps, cooling };
  };

  it('ignores a fire once the cadence is restored, so one hold never sweeps twice', async () => {
    const { sweeps, cooling } = wired();
    cooling.start();
    hook().restore();
    hook().fire();
    await new Promise((resolve) => setTimeout(resolve, cadenceMs * 6));
    cooling.dispose();

    expect(sweeps()).toBe(1);
  });

  it('arms nothing more on a second restore', async () => {
    const { sweeps, cooling } = wired();
    cooling.start();
    hook().restore();
    hook().restore();
    await new Promise((resolve) => setTimeout(resolve, cadenceMs * 6));
    cooling.dispose();

    expect(sweeps()).toBe(1);
  });
});

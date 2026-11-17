import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { holdStartForProof, installLandingProofHook, type LandingProofHook } from './landing-proof.js';

type ProofGlobal = typeof globalThis & { __studioLandingProof?: LandingProofHook };

const savedFlag = process.env['STUDIO_LANDING_PROOF'];

function settled(promise: Promise<void>): Promise<boolean> {
  return Promise.race([promise.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 20))]);
}

afterEach(() => {
  (globalThis as ProofGlobal).__studioLandingProof?.release();
  delete (globalThis as ProofGlobal).__studioLandingProof;
});

afterAll(() => {
  if (savedFlag === undefined) delete process.env['STUDIO_LANDING_PROOF'];
  else process.env['STUDIO_LANDING_PROOF'] = savedFlag;
});

describe('the landing proof hook', () => {
  it('is absent without the flag, and a start never parks', async () => {
    delete process.env['STUDIO_LANDING_PROOF'];
    installLandingProofHook();
    expect((globalThis as ProofGlobal).__studioLandingProof).toBeUndefined();
    expect(await settled(holdStartForProof('/w/one'))).toBe(true);
  });

  it('passes a start through until armed', async () => {
    process.env['STUDIO_LANDING_PROOF'] = '1';
    installLandingProofHook();
    const hook = (globalThis as ProofGlobal).__studioLandingProof!;
    expect(await settled(holdStartForProof('/w/one'))).toBe(true);
    expect(hook.parked()).toEqual([]);
  });

  it('parks every start while armed, and release lets them all continue and disarms', async () => {
    process.env['STUDIO_LANDING_PROOF'] = '1';
    installLandingProofHook();
    const hook = (globalThis as ProofGlobal).__studioLandingProof!;
    hook.arm();
    const first = holdStartForProof('/w/one');
    const second = holdStartForProof('/w/two');
    expect(await settled(first)).toBe(false);
    expect(hook.parked()).toEqual(['/w/one', '/w/two']);

    hook.release();
    expect(await settled(first)).toBe(true);
    expect(await settled(second)).toBe(true);
    expect(hook.parked()).toEqual([]);
    expect(await settled(holdStartForProof('/w/three'))).toBe(true);
  });
});

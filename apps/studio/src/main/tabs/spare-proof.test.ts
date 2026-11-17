import { afterEach, describe, expect, it } from 'bun:test';
import { SPARE_PROOF_ENV, installSpareProof, type SpareProofHook } from './spare-proof.js';
import { SpareKeeper, type SpareSeams } from './spare.js';

const saved = process.env[SPARE_PROOF_ENV];

afterEach(() => {
  if (saved === undefined) delete process.env[SPARE_PROOF_ENV];
  else process.env[SPARE_PROOF_ENV] = saved;
  delete (globalThis as { __studioTabsProof?: SpareProofHook }).__studioTabsProof;
});

const installed = (): SpareProofHook | undefined =>
  (globalThis as { __studioTabsProof?: SpareProofHook }).__studioTabsProof;

function keeper(): SpareKeeper<{ id: string }> {
  let fire: (() => void) | undefined;
  const seams: SpareSeams<{ id: string }> = {
    mint: () => ({ id: 'tab-1' }),
    destroy: () => undefined,
    setTimer: (fn) => {
      fire = fn;
      return 1;
    },
    clearTimer: () => undefined,
    isQuitting: () => false,
  };
  const made = new SpareKeeper(seams);
  made.arm();
  fire?.();
  return made;
}

describe('the spare probe is off unless a proof is driving (ONL-2318)', () => {
  it('writes no global when the gate is unset', () => {
    delete process.env[SPARE_PROOF_ENV];

    installSpareProof(() => 'held');

    expect(installed()).toBeUndefined();
  });

  it('writes no global for any value but the gate', () => {
    process.env[SPARE_PROOF_ENV] = '0';

    installSpareProof(() => 'held');

    expect(installed()).toBeUndefined();
  });
});

describe('what the probe answers', () => {
  it('reads the keeper live, so a press reads what the keeper holds then', () => {
    process.env[SPARE_PROOF_ENV] = '1';
    const held = keeper();
    installSpareProof(() => held.state);

    expect(installed()?.state()).toBe('held');
    held.take();

    expect(installed()?.state()).toBe('none');
  });
});

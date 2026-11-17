import { proofSwitchOn } from '../diagnostics/gate.js';

/** The proof runner's seat (ONL-2265): armed, every start parks after `planSession` until `release`. */
export interface LandingProofHook {
  arm(): void;
  parked(): string[];
  release(): void;
}

type ProofGlobal = typeof globalThis & { __studioLandingProof?: LandingProofHook };

let armed = false;
const held: { cwd: string; resume: () => void }[] = [];

export function installLandingProofHook(): void {
  if (!proofSwitchOn('STUDIO_LANDING_PROOF')) return;
  (globalThis as ProofGlobal).__studioLandingProof = {
    arm: () => {
      armed = true;
    },
    parked: () => held.map((entry) => entry.cwd),
    release: () => {
      armed = false;
      for (const entry of held.splice(0)) entry.resume();
    },
  };
}

export function holdStartForProof(cwd: string): Promise<void> {
  if (!armed || (globalThis as ProofGlobal).__studioLandingProof === undefined) return Promise.resolve();
  return new Promise((resume) => {
    held.push({ cwd, resume });
  });
}

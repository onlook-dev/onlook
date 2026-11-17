import { proofSwitchOn, type ProofSwitch } from '../diagnostics/gate.js';
import type { SpareState } from './spare.js';

export interface SpareProofHook {
  state(): SpareState;
}

type Scope = typeof globalThis & { __studioTabsProof?: SpareProofHook };

/** Shared with the setup seam: every recipe that drives tabs already sets it, and reading changes none of them. */
export const SPARE_PROOF_ENV: ProofSwitch = 'STUDIO_SETUP_PROOF';

/** The window registered last answers; a recipe that reads this drives one window. */
export function installSpareProof(state: () => SpareState): void {
  if (!proofSwitchOn(SPARE_PROOF_ENV)) return;
  (globalThis as Scope).__studioTabsProof = { state };
}

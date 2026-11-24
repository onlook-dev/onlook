import { isSetupHarnessId, type HarnessId, type SetupHarnessId } from '@studio/events';
import { HARNESSES } from '@studio/onboarding-ui/state';
import { isConnected, type SetupFacts } from '../agents/mapping.js';

/** A credential the boot pre-check found enables nothing until a tap (ONL-2186). */
export function canContinue(facts: Pick<SetupFacts, 'claude' | 'codex' | 'touched'>): boolean {
  return HARNESSES.some((harness) => facts.touched[harness] && isConnected(facts, harness));
}

export function skipsDetectedSetup(facts: Pick<SetupFacts, 'claude' | 'codex' | 'touched'>, harness: HarnessId): boolean {
  return isSetupHarnessId(harness) && !facts.touched[harness] && isConnected(facts, harness);
}

export function harnessToRecord(store: { lastConnected: SetupHarnessId | null }): SetupHarnessId {
  return store.lastConnected ?? 'claude';
}

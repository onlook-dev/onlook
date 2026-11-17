import type { TabStatus } from '@studio/events';
import { closeConfirmation, type CloseConfirmation } from './close-confirm.js';
import { tabPurpose, type TabPurpose } from './purpose.js';

export interface TabFacts {
  /** A code tab holding text that was never written. */
  hasUnsavedCode?: boolean;
  isWorking: boolean;
  status: TabStatus | undefined;
  workspacePath?: string;
  /** A cut still RUNNING — `ProjectCreations.inFlight`. */
  isCreating: boolean;
  /** A creation RECORD, settled or not — a refusal still owns its chip (ONL-2244). */
  hasCreation: boolean;
}

export interface TabDecisions {
  close: CloseConfirmation;
  isBusy: boolean;
  purpose: TabPurpose;
}

/** One place the two creation questions are told apart, so a call site cannot quietly swap them (ONL-2209, ONL-2210). */
export function tabDecisions(facts: TabFacts): TabDecisions {
  return {
    close: closeConfirmation({
      ...(facts.hasUnsavedCode === undefined ? {} : { hasUnsavedCode: facts.hasUnsavedCode }),
      isWorking: facts.isWorking,
      status: facts.status,
      isCreating: facts.isCreating,
    }),
    // Unsaved code blocks cooling separately without showing the tab as working (ONL-2563).
    isBusy: facts.isWorking || facts.status === 'waiting' || facts.isCreating,
    purpose: tabPurpose({
      ...(facts.workspacePath === undefined ? {} : { workspacePath: facts.workspacePath }),
      isCreating: facts.hasCreation,
    }),
  };
}

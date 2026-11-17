import type { TabAssignment } from '@studio/events';

export interface AssignmentFacts {
  tabId: string;
  workspacePath?: string;
  /** A creation RECORD, settled or not — a refusal owns its tab's surface as much as a running cut does. */
  hasCreation: boolean;
  repoIdentity?: string;
}

/** `null` is "not yet", never "go home" (ONL-2318). */
export function assignmentFor(facts: AssignmentFacts): TabAssignment | null {
  if (facts.workspacePath !== undefined) {
    if (facts.repoIdentity === undefined) return null;
    return {
      tabId: facts.tabId,
      purpose: 'project',
      workspacePath: facts.workspacePath,
      repoIdentity: facts.repoIdentity,
    };
  }
  // A record here is a cut or a refusal: home discards it, and `commitFirstScreen` will not commit over `projects` (ONL-2244).
  return facts.hasCreation ? null : { tabId: facts.tabId, purpose: 'projects' };
}

export interface TellFacts {
  wasCold: boolean;
  tookSpare: boolean;
  /** Warmed in the background before this press, so its renderer is parked and unassigned (ONL-3153). */
  wasWarmedCold: boolean;
  isCreating: boolean;
}

/** A promoted spare kept its `parked` birth and was never re-loaded: with no cut behind it, nothing else tells it what it is (ONL-2318). */
export function needsTelling(facts: TellFacts): boolean {
  if (facts.isCreating) return false;
  return facts.wasCold || facts.tookSpare || facts.wasWarmedCold;
}

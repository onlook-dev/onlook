export interface ClosingTab {
  workspacePath: string | undefined;
  /** Registered by a create before any `location:set` fills `workspacePath` (ONL-2265). */
  registeredWorkspace: string | undefined;
}

export interface TabCloseDecision {
  retire: string | undefined;
  stopSession: boolean;
  exitToProjects: boolean;
}

export function tabCloseDecision(
  tab: ClosingTab,
  isLastTab: boolean,
  heldByAnotherTab: (workspace: string) => boolean,
): TabCloseDecision {
  const retire = tab.workspacePath ?? tab.registeredWorkspace;
  if (isLastTab) return { retire, stopSession: retire !== undefined, exitToProjects: true };
  return {
    retire,
    stopSession: retire !== undefined && !heldByAnotherTab(retire),
    exitToProjects: false,
  };
}

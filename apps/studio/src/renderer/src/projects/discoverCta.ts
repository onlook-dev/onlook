export function discoverCardVisible(state: {
  isPrimed: boolean;
  hasProject: boolean;
  isResolved: boolean;
  isResolvedInSession: boolean;
}): boolean {
  return state.isPrimed && state.hasProject && !state.isResolved && !state.isResolvedInSession;
}

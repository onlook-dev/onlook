/** `AlertDialog.isActionLoading` does not block Escape, so a dismissed attempt's answer can still arrive (ONL-2198). */
export interface ConfirmState {
  status: 'idle' | 'starting' | 'failed';
  attempt: number;
}

export function idleConfirm(): ConfirmState {
  return { status: 'idle', attempt: 0 };
}

export function startAttempt(state: ConfirmState): ConfirmState {
  return { status: 'starting', attempt: state.attempt + 1 };
}

export function beginAttempt(live: ConfirmState): { next: ConfirmState; started: boolean } {
  if (live.status === 'starting') return { next: live, started: false };
  return { next: startAttempt(live), started: true };
}

export function dismissConfirm(state: ConfirmState): ConfirmState {
  return { status: 'idle', attempt: state.attempt + 1 };
}

export function settleConfirm(
  live: ConfirmState,
  attempt: number,
  outcome: 'accepted' | 'refused',
): { next: ConfirmState; close: boolean; applied: boolean } {
  if (attempt !== live.attempt) return { next: live, close: false, applied: false };
  if (outcome === 'accepted') return { next: dismissConfirm(live), close: true, applied: true };
  return { next: { status: 'failed', attempt: live.attempt }, close: false, applied: true };
}

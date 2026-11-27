import type { GitMeasurement, GitPillDefaults, GitSnapshotRow } from '@studio/events';
import { isActionable, workingAsFor } from './state.js';
import type { GitCardStateId, GitPillState, GitPillStateId, GitPullRequest } from './state.js';

export function derivePillState(
  row: GitSnapshotRow | undefined,
  defaults: GitPillDefaults,
): GitPillState {
  if (row === undefined || row.invalidated) return { id: 'first-paint' };
  const state = cascade(row.measurement, defaults);
  return row.stale ? { ...state, mode: 'stale' } : state;
}

/** Not re-exported from `index.ts`: that routes every consumer through `GitStatusPill` -> `@studio/chat-ui`, and the cycle throws `Cannot access 'FAMILY' before initialization` at render time (ONL-2206). */
export function pillStateOf(
  row: GitSnapshotRow | undefined,
  defaults: GitPillDefaults,
  isWorking: boolean,
  workingAction?: string,
): GitPillState {
  const rest = derivePillState(row, defaults);
  if (!isWorking || !isActionable(rest.id)) return rest;
  const workingAs = workingAsFor(workingAction);
  return { ...rest, mode: 'working', ...(workingAs && workingAs !== rest.id ? { workingAs } : {}) } as GitPillState;
}

function cascade(m: GitMeasurement, defaults: GitPillDefaults): GitPillState {
  if (m.history === 'none') return { id: 'no-git' };
  if (!m.gitInstalled) return { id: 'first-paint' };
  if (m.head !== 'branch' || m.origin !== 'github') return { id: 'local-only' };
  if (!m.ghInstalled || !m.ghAuthed) return { id: 'connect-github' };
  if (m.access === 'denied') {
    const reason = m.accessReason === 'sso_required' ? 'sso' : m.accessReason === 'approval_required' ? 'approval' : undefined;
    return {
      id: 'no-access',
      repo: m.repo ?? '',
      ...(m.ghAccount === undefined ? {} : { account: m.ghAccount }),
      ...(reason === undefined ? {} : { reason }),
    };
  }
  const pr = m.pr;
  if (pr === undefined) {
    const dirty = m.dirty || m.aheadOfUpstream;
    return defaults.noPr === 'push' ? { id: 'push', dirty } : { id: 'create-pr', dirty };
  }
  const ref: GitPullRequest = { number: pr.number, url: pr.url };
  if (pr.state === 'MERGED') return { id: 'merged', pr: ref };
  if (pr.state === 'CLOSED') return { id: 'pr-closed', pr: ref };
  if (pr.isDraft) return { id: 'draft-pr', pr: ref };
  if (pr.mergeStateStatus === 'DIRTY') return { id: 'resolve-conflicts', pr: ref };
  if (pr.checks === 'failing') return { id: 'fix-checks', pr: ref, dirty: m.dirty || m.aheadOfUpstream };
  if (m.behind > 0 || pr.mergeStateStatus === 'BEHIND') return { id: 'download-changes', pr: ref };
  if (m.dirty || m.aheadOfUpstream) return { id: 'upload-changes', pr: ref };
  if (pr.checks === 'pending') return { id: 'checks-running', pr: ref };
  if (pr.mergeStateStatus === 'BLOCKED' || pr.viewerCanMerge === false) {
    return { id: 'ready-to-merge', pr: ref, dropdownDefault: 'open-in-browser' };
  }
  return { id: 'ready-to-merge', pr: ref, dropdownDefault: defaults.ready };
}

const CARD_OF: Record<GitPillStateId, GitCardStateId> = {
  'no-git': 'no-git',
  'no-access': 'local-only',
  'connect-github': 'local-only',
  'local-only': 'local-only',
  'first-paint': 'none',
  merged: 'merged',
  'pr-closed': 'none',
  'draft-pr': 'none',
  'resolve-conflicts': 'conflicts',
  'fix-checks': 'checks-failed',
  'download-changes': 'updates-available',
  'upload-changes': 'not-uploaded',
  'checks-running': 'checks-running',
  'ready-to-merge': 'ready-to-merge',
  'create-pr': 'none',
  push: 'none',
};

export function cardStateFor(state: GitPillState): GitCardStateId {
  if ((state.id === 'create-pr' || state.id === 'push') && state.dirty) return 'not-uploaded';
  return CARD_OF[state.id];
}

export function restOf(state: GitPillState): GitPillState {
  return state.mode === 'stale' ? { ...state, mode: undefined } : state;
}

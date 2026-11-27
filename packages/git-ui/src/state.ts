export interface GitPullRequest {
  number: number;
  url: string;
}

export type GitPillMode = 'stale' | 'working';

interface Readout {
  mode?: 'stale';
}

interface Actionable {
  mode?: GitPillMode;
  /** Set when the press started something other than the state's own action. */
  workingAs?: GitPillActionableId;
}

export type NoPrDefault = 'create-pr' | 'push';
export type ReadyDefault = 'open-in-browser' | 'merge';

export type GitPillState =
  | ({ id: 'no-git' } & Readout)
  | ({ id: 'no-access'; repo: string; account: string } & Readout)
  | ({ id: 'connect-github' } & Actionable)
  | ({ id: 'local-only' } & Readout)
  | ({ id: 'first-paint' } & Readout)
  | ({ id: 'merged'; pr: GitPullRequest } & Readout)
  | ({ id: 'pr-closed'; pr: GitPullRequest } & Readout)
  | ({ id: 'draft-pr'; pr: GitPullRequest } & Readout)
  | ({ id: 'resolve-conflicts'; pr: GitPullRequest } & Actionable)
  | ({ id: 'fix-checks'; pr: GitPullRequest; dirty?: boolean } & Actionable)
  | ({ id: 'download-changes'; pr: GitPullRequest } & Actionable)
  | ({ id: 'upload-changes'; pr: GitPullRequest } & Actionable)
  | ({ id: 'checks-running'; pr: GitPullRequest } & Readout)
  | ({ id: 'ready-to-merge'; pr: GitPullRequest; dropdownDefault: ReadyDefault } & Actionable)
  | ({ id: 'create-pr'; dirty?: boolean } & Actionable)
  | ({ id: 'push'; dirty?: boolean } & Actionable);

export type GitPillStateId = GitPillState['id'];

export const GIT_PILL_STATES = [
  'no-git',
  'no-access',
  'connect-github',
  'local-only',
  'first-paint',
  'merged',
  'pr-closed',
  'draft-pr',
  'resolve-conflicts',
  'fix-checks',
  'download-changes',
  'upload-changes',
  'checks-running',
  'ready-to-merge',
  'create-pr',
  'push',
] as const satisfies readonly GitPillStateId[];

export type GitPillActionableId =
  | 'connect-github'
  | 'resolve-conflicts'
  | 'fix-checks'
  | 'download-changes'
  | 'upload-changes'
  | 'ready-to-merge'
  | 'create-pr'
  | 'push';

export const GIT_PILL_ACTIONABLE: readonly GitPillActionableId[] = [
  'connect-github',
  'resolve-conflicts',
  'fix-checks',
  'download-changes',
  'upload-changes',
  'ready-to-merge',
  'create-pr',
  'push',
];

export function isActionable(id: GitPillStateId): id is GitPillActionableId {
  return (GIT_PILL_ACTIONABLE as readonly string[]).includes(id);
}

/** `open-in-browser` has no working state. */
export function workingAsFor(action: string | undefined): GitPillActionableId | undefined {
  if (action === 'merge') return 'ready-to-merge';
  return (GIT_PILL_ACTIONABLE as readonly string[]).includes(action ?? '') ? (action as GitPillActionableId) : undefined;
}

export type GitPillDropdownId = 'create-pr' | 'push' | 'ready-to-merge' | 'fix-checks';

export type GitDropdownOption = NoPrDefault | ReadyDefault | 'upload-changes';

export function hasDropdown(id: GitPillStateId): id is GitPillDropdownId {
  return id === 'create-pr' || id === 'push' || id === 'ready-to-merge' || id === 'fix-checks';
}

export function dropdownFor(state: GitPillState): GitPillDropdownId | undefined {
  if (!hasDropdown(state.id)) return undefined;
  if (state.id === 'fix-checks') return state.dirty ? 'fix-checks' : undefined;
  return state.id;
}

export function prOf(state: GitPillState): GitPullRequest | undefined {
  return 'pr' in state ? state.pr : undefined;
}

export type GitCardStateId =
  | 'none'
  | 'no-git'
  | 'checks-failed'
  | 'conflicts'
  | 'checks-running'
  | 'updates-available'
  | 'not-uploaded'
  | 'ready-to-merge'
  | 'merged'
  | 'local-only';

export const GIT_CARD_STATES = [
  'no-git',
  'none',
  'checks-failed',
  'conflicts',
  'checks-running',
  'updates-available',
  'not-uploaded',
  'ready-to-merge',
  'merged',
  'local-only',
] as const satisfies readonly GitCardStateId[];

export const GIT_CARD_ATTENTION: readonly GitCardStateId[] = ['checks-failed', 'conflicts', 'checks-running'];

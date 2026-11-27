import type { GitCardStateId, GitDropdownOption, GitNoAccessReason, GitPillActionableId, GitPillStateId, ReadyDefault } from './state.js';

/** Working labels end in three periods in the app's catalog, not here. */
export interface GitStatusStrings {
  pillLabel: Record<Exclude<GitPillStateId, 'first-paint'>, string>;
  workingLabel: Record<GitPillActionableId, string>;
  cardLabel: Record<Exclude<GitCardStateId, 'none'>, string>;
  option: Record<GitDropdownOption, string>;
  /** The action a press takes, not the status word. */
  hoverLabel: Record<ReadyDefault, string>;
  /** An action waiting on the agent's turn: its word, the word a press takes it back with, and the line naming what it waits on (ONL-2379). */
  queuedLabel: string;
  queuedTakeBack: string;
  queuedHint: string;
  dropdownHeading: string;
  /** The tooltip's leading line, by what blocks the account: `named` fills `{repo}` and `{account}`, `nameless` only `{repo}`. */
  noAccessLine: Record<GitNoAccessReason | 'plain', { named: string; nameless: string }>;
  /** `{number}` template. */
  openPrAria: string;
  openMenuAria: string;
  separator: string;
}

export { fill } from '@studio/chat-ui';

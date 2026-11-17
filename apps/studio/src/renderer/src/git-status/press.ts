/** Pure and store-free: the chrome view's process draws the pill but cannot see the agent session, which only the owning tab's can (ONL-2206). */

import type { GitMeasurement, GitSnapshotRow } from '@studio/events';
import type { GitDropdownOption, GitPillState, NoPrDefault, ReadyDefault } from '@studio/git-ui';

import { intlLocale, t, type StringKey } from '@studio/i18n';
import type { GitPillAction } from './store.js';

export function promptKeyFor(state: GitPillState): StringKey | undefined {
  switch (state.id) {
    case 'create-pr':
      return 'gitStatus.prompt.create-pr';
    case 'push':
      return 'gitStatus.prompt.push';
    case 'upload-changes':
      return 'gitStatus.prompt.upload-changes';
    case 'download-changes':
      return 'gitStatus.prompt.download-changes';
    case 'fix-checks':
      return 'gitStatus.prompt.fix-checks';
    case 'resolve-conflicts':
      return 'gitStatus.prompt.resolve-conflicts';
    case 'connect-github':
      return 'gitStatus.prompt.connect-github';
    case 'ready-to-merge':
      return state.dropdownDefault === 'merge' ? 'gitStatus.prompt.merge' : undefined;
    default:
      return undefined;
  }
}

function promptKeyForOption(option: GitDropdownOption): StringKey | undefined {
  if (option === 'create-pr') return 'gitStatus.prompt.create-pr';
  if (option === 'push') return 'gitStatus.prompt.push';
  if (option === 'merge') return 'gitStatus.prompt.merge';
  if (option === 'upload-changes') return 'gitStatus.prompt.upload-changes';
  return undefined;
}

export type GitClickResult =
  | { kind: 'open-browser'; url: string }
  | { kind: 'send'; action: GitPillAction; key: StringKey }
  | { kind: 'none' };

function opensBrowserFor(
  state: GitPillState,
): state is Extract<GitPillState, { id: 'ready-to-merge' }> {
  return state.id === 'ready-to-merge' && state.dropdownDefault === 'open-in-browser';
}

function sendOrNone(
  key: StringKey | undefined,
  action: GitPillAction,
  canSubmit: boolean,
): GitClickResult {
  if (key === undefined || !canSubmit) return { kind: 'none' };
  return { kind: 'send', action, key };
}

export function actionFor(state: GitPillState, canSubmit: boolean): GitClickResult {
  if (opensBrowserFor(state)) return { kind: 'open-browser', url: state.pr.url };
  return sendOrNone(promptKeyFor(state), state.id, canSubmit);
}

export function pickFor(
  state: GitPillState,
  option: GitDropdownOption,
  canSubmit: boolean,
): GitClickResult {
  if (option === 'open-in-browser') {
    return state.id === 'ready-to-merge'
      ? { kind: 'open-browser', url: state.pr.url }
      : { kind: 'none' };
  }
  return sendOrNone(promptKeyForOption(option), option, canSubmit);
}

export function drawsPill(row: GitSnapshotRow | undefined): boolean {
  return row === undefined || row.measurement.gitInstalled;
}

export function isPressable(state: GitPillState, canSubmit: boolean): boolean {
  return canSubmit || opensBrowserFor(state);
}

export function isNoPrOption(option: GitDropdownOption): option is NoPrDefault {
  return option === 'create-pr' || option === 'push';
}

export function isReadyOption(option: GitDropdownOption): option is ReadyDefault {
  return option === 'open-in-browser' || option === 'merge';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(intlLocale(), { hour: 'numeric', minute: '2-digit' });
}

function measuredBranch(measurement: GitMeasurement): string | undefined {
  return measurement.gitInstalled ? measurement.branch : undefined;
}

export function tooltipFor(row: GitSnapshotRow | undefined): readonly string[] | undefined {
  if (row === undefined) return undefined;
  const { measurement } = row;
  const branch = measuredBranch(measurement);
  if (branch === undefined) return undefined;
  return [
    branch,
    t('gitStatus.tooltip.aheadBehind', { ahead: measurement.ahead, behind: measurement.behind }),
    t('gitStatus.tooltip.asOf', { time: formatTime(row.fetchedAt ?? row.measuredAt) }),
  ];
}

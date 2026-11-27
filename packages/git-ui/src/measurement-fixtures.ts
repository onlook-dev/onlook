import type { GitMeasuredPullRequest, GitMeasurement, GitSnapshotRow } from '@studio/events';
import type { GitPillStateId } from './state.js';

const BASE: GitMeasurement = {
  gitInstalled: true,
  ghInstalled: true,
  ghAuthed: true,
  ghAccount: 'wrenquill',
  origin: 'github',
  repo: 'onlook-dev/studio',
  access: 'granted',
  branch: 'feat/pricing-v2',
  head: 'branch',
  baseBranch: 'main',
  baseExists: true,
  ahead: 0,
  behind: 0,
  dirty: false,
  aheadOfUpstream: false,
};

const OPEN_PR: GitMeasuredPullRequest = {
  number: 313,
  url: 'https://github.com/onlook-dev/studio/pull/313',
  state: 'OPEN',
  isDraft: false,
  mergeStateStatus: 'CLEAN',
  checks: 'passing',
  baseRefName: 'main',
  updatedAt: '2026-08-28T10:00:00Z',
};

export function measurement(patch: Partial<GitMeasurement> = {}, pr?: Partial<GitMeasuredPullRequest>): GitMeasurement {
  return { ...BASE, ...patch, ...(pr === undefined ? {} : { pr: { ...OPEN_PR, ...pr } }) };
}

export const MEASUREMENT_FIXTURES: Record<GitPillStateId, GitMeasurement> = {
  'no-git': measurement({ history: 'none', gitInstalled: false, origin: 'none', head: 'unborn', branch: undefined, repo: undefined }),
  'no-access': measurement({ access: 'denied' }),
  'connect-github': measurement({ ghAuthed: false }),
  'local-only': measurement({ origin: 'none', repo: undefined }),
  'first-paint': measurement({ gitInstalled: false }),
  merged: measurement({}, { state: 'MERGED' }),
  'pr-closed': measurement({}, { state: 'CLOSED' }),
  'draft-pr': measurement({}, { isDraft: true, checks: 'failing' }),
  'resolve-conflicts': measurement({}, { mergeStateStatus: 'DIRTY', checks: 'failing' }),
  'fix-checks': measurement({ behind: 2 }, { checks: 'failing' }),
  'download-changes': measurement({ behind: 4, dirty: true }, { mergeStateStatus: 'BEHIND' }),
  'upload-changes': measurement({ dirty: true }, { checks: 'pending' }),
  'checks-running': measurement({}, { mergeStateStatus: 'UNKNOWN', checks: 'pending' }),
  'ready-to-merge': measurement({}, { mergeStateStatus: 'UNKNOWN', checks: 'none' }),
  'create-pr': measurement({ dirty: true }),
  push: measurement({ aheadOfUpstream: true }),
};

export const BLOCKED_MEASUREMENT: GitMeasurement = measurement({}, { mergeStateStatus: 'BLOCKED', checks: 'passing' });
export const ACCOUNT_MEASUREMENTS = {
  connected: measurement({ connectViaBrowser: true, dirty: true }),
  disconnected: measurement({ connectViaBrowser: true, ghInstalled: false, ghAuthed: false }),
  'no-access': measurement({ connectViaBrowser: true, access: 'denied' }),
  'pull-request-open': measurement({ connectViaBrowser: true, dirty: false, aheadOfUpstream: false }, { checks: 'passing' }),
  fallback: measurement({ dirty: true }),
} satisfies Record<string, GitMeasurement>;
export const READ_ONLY_PARENT_MEASUREMENT: GitMeasurement = measurement(
  {},
  { mergeStateStatus: 'CLEAN', checks: 'passing', viewerCanMerge: false },
);
export const BEHIND_UPSTREAM_MEASUREMENT: GitMeasurement = measurement(
  { behind: 0 },
  { mergeStateStatus: 'BEHIND', checks: 'passing' },
);

export function row(m: GitMeasurement, patch: Partial<GitSnapshotRow> = {}): GitSnapshotRow {
  return { measurement: m, measuredAt: '2026-08-28T10:00:00Z', fetchedAt: '2026-08-28T09:59:00Z', trigger: 'open', stale: false, ...patch };
}

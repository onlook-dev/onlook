import type { GitPillState, GitPillStateId } from './state.js';
import type { GitStatusStrings } from './strings.js';

export const STUB_STRINGS: GitStatusStrings = {
  pillLabel: {
    'no-git': 'No Git yet',
    'no-access': 'No Access',
    'connect-github': 'Connect GitHub',
    'local-only': 'Local Only',
    merged: 'Merged',
    'pr-closed': 'PR Closed',
    'draft-pr': 'Draft PR',
    'resolve-conflicts': 'Resolve Conflicts',
    'fix-checks': 'Fix Checks',
    'download-changes': 'Download Changes',
    'upload-changes': 'Upload Changes',
    'checks-running': 'Checks Running',
    'ready-to-merge': 'Ready to Merge',
    'create-pr': 'Create PR',
    push: 'Push to Main',
  },
  workingLabel: {
    'connect-github': 'Connecting',
    'resolve-conflicts': 'Resolving Conflicts',
    'fix-checks': 'Fixing Checks',
    'download-changes': 'Downloading Changes',
    'upload-changes': 'Uploading Changes',
    'ready-to-merge': 'Merging',
    'create-pr': 'Creating PR',
    push: 'Pushing',
  },
  cardLabel: {
    'no-git': 'No Git yet',
    'checks-failed': 'Checks Failed',
    conflicts: 'Conflicts',
    'checks-running': 'Checks Running',
    'updates-available': 'Updates Available',
    'not-uploaded': 'Not Uploaded',
    'ready-to-merge': 'Ready to Merge',
    merged: 'Merged',
    'local-only': 'Local Only',
  },
  hoverLabel: {
    merge: 'Start Merge',
    'open-in-browser': 'Open in Browser',
  },
  queuedLabel: 'Queued',
  queuedTakeBack: 'Take Back',
  queuedHint: 'Runs when the agent finishes this turn',
  option: {
    'create-pr': 'Create PR',
    push: 'Push to Main',
    'open-in-browser': 'Open in browser',
    merge: 'Merge',
    'upload-changes': 'Upload Changes',
  },
  dropdownHeading: 'Choose the default action',
  noAccessLine: {
    plain: {
      named: '{repo} · no access for @{account} · ask an owner',
      nameless: '{repo} · no access · ask an owner',
    },
    sso: {
      named: '{repo} · no access for @{account} · authorize this account for SSO on GitHub',
      nameless: '{repo} · no access · authorize your account for SSO on GitHub',
    },
    approval: {
      named: '{repo} · no access for @{account} · ask the organization to approve Onlook on GitHub',
      nameless: '{repo} · no access · ask the organization to approve Onlook on GitHub',
    },
  },
  openPrAria: 'Open pull request #{number}',
  openMenuAria: 'More actions',
  separator: '·',
};

const PR = { number: 313, url: 'https://example.test/pr/313' };

export const PILL_FIXTURES: Record<GitPillStateId, GitPillState> = {
  'no-git': { id: 'no-git' },
  'no-access': { id: 'no-access', repo: 'onlook-dev/studio', account: 'wrenquill' },
  'connect-github': { id: 'connect-github' },
  'local-only': { id: 'local-only' },
  'first-paint': { id: 'first-paint' },
  merged: { id: 'merged', pr: PR },
  'pr-closed': { id: 'pr-closed', pr: PR },
  'draft-pr': { id: 'draft-pr', pr: PR },
  'resolve-conflicts': { id: 'resolve-conflicts', pr: PR },
  'fix-checks': { id: 'fix-checks', pr: PR },
  'download-changes': { id: 'download-changes', pr: PR },
  'upload-changes': { id: 'upload-changes', pr: PR },
  'checks-running': { id: 'checks-running', pr: PR },
  'ready-to-merge': { id: 'ready-to-merge', pr: PR, dropdownDefault: 'open-in-browser' },
  'create-pr': { id: 'create-pr' },
  push: { id: 'push' },
};

import type { GitPrFailure, GitSnapshotRow } from '@studio/events';

export function classifyPrFailure(output: string): GitPrFailure | undefined {
  if (/no commits between|no changes to publish/i.test(output)) return 'no-changes';
  if (/\bSAML(?:\s+SSO)?\s+(?:enforcement|authorization|authentication)|(?:enabled|enforced|requires?|protected by).{0,60}\b(?:SAML|SSO)\b|\bSSO\s+(?:is\s+)?required|\borgani[sz]ation\s+.{0,100}(?:approv|authoriz)|(?:token|oauth).{0,100}\borgani[sz]ation\s+.{0,50}approv/i.test(output)) return 'org-approval';
  if (/gh auth login|not logged (?:in|into)|authentication failed|bad credentials|HTTP 401|could not read Username|invalid authentication token/i.test(output)) return 'sign-in';
  if (/\[rejected\]|\[remote rejected\]|failed to push|non-fast-forward|permission to .{0,200} denied|write access.{0,80}not granted|protected branch|repository rule violations/i.test(output)) return 'push-refused';
  return undefined;
}

export function prFailureFor(row: GitSnapshotRow, observed: GitPrFailure | undefined): GitPrFailure {
  if (observed !== undefined) return observed;
  const measured = row.measurement;
  if (!row.stale && !measured.partial && measured.ghInstalled && !measured.ghAuthed) return 'sign-in';
  if (!row.stale && !measured.partial && measured.baseExists && !measured.dirty && measured.ahead === 0) return 'no-changes';
  return 'unknown';
}

import type { GitPrFailure, GitSnapshotRow } from '@studio/events';

export function classifyPrFailure(output: string): GitPrFailure | undefined {
  if (/saml|\bsso\b|organi[sz]ation.{0,100}(?:approv|authoriz)|(?:token|oauth).{0,100}organi[sz]ation.{0,50}approv/i.test(output)) return 'org-approval';
  if (/gh auth login|not logged (?:in|into)|authentication failed|bad credentials|HTTP 401|could not read Username|invalid authentication token/i.test(output)) return 'sign-in';
  if (/\[rejected\]|\[remote rejected\]|failed to push|non-fast-forward|permission to .{0,200} denied|write access.{0,80}not granted|protected branch|repository rule violations/i.test(output)) return 'push-refused';
  if (/no commits between|nothing to commit|no changes to (?:publish|commit)|no commits? (?:ahead|to)/i.test(output)) return 'no-changes';
  return undefined;
}

export function prFailureFor(row: GitSnapshotRow, observed: GitPrFailure | undefined): GitPrFailure {
  if (observed !== undefined) return observed;
  const measured = row.measurement;
  if (!row.stale && !measured.partial && measured.baseExists && !measured.dirty && measured.ahead === 0) return 'no-changes';
  return 'unknown';
}

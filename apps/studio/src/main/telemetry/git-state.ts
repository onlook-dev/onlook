import type { GitMeasurement, GitMeasureTrigger } from '@studio/events';
import type { TelemetryEventMap } from './events.js';

export type GitStateReason =
  | 'measurement-unavailable'
  | 'git-missing'
  | 'unborn'
  | 'detached'
  | 'no-remote'
  | 'non-github'
  | 'gh-missing'
  | 'gh-signed-out'
  | 'repo-not-visible'
  | 'read-only'
  | 'access-denied'
  | 'partial'
  | 'ready';

export function gitStateProperties(
  measurement: GitMeasurement | undefined,
  trigger: GitMeasureTrigger,
  fetched: boolean | undefined,
): Omit<TelemetryEventMap['git_state_measured'], 'project_id'> {
  const githubProbed = measurement?.head === 'branch' && measurement.origin === 'github';
  const ghInstalled = !githubProbed || measurement === undefined ? null : measurement.partial && !measurement.ghAuthed ? null : measurement.ghInstalled;
  const ghAuthed = ghInstalled === true ? measurement?.ghAuthed ?? null : null;
  let reason: GitStateReason;
  if (measurement === undefined) reason = 'measurement-unavailable';
  else if (!measurement.gitInstalled) reason = 'git-missing';
  else if (measurement.head === 'unborn') reason = 'unborn';
  else if (measurement.head === 'detached') reason = 'detached';
  else if (measurement.origin === 'none') reason = 'no-remote';
  else if (measurement.origin !== 'github') reason = 'non-github';
  else if (ghInstalled === false) reason = 'gh-missing';
  else if (ghAuthed === false) reason = 'gh-signed-out';
  else if (measurement.access === 'denied') reason = measurement.accessReason === 'repo-not-visible' || measurement.accessReason === 'read-only' ? measurement.accessReason : 'access-denied';
  else if (measurement.partial || measurement.access === 'unknown') reason = 'partial';
  else reason = 'ready';
  return {
    trigger,
    reason,
    git_installed: measurement?.gitInstalled ?? null,
    gh_installed: ghInstalled,
    gh_authenticated: ghAuthed,
    origin: measurement?.gitInstalled ? measurement.origin : null,
    head: measurement?.gitInstalled ? measurement.head : null,
    access: ghAuthed === true ? measurement?.access ?? null : null,
    partial: measurement?.partial ?? (measurement === undefined ? null : false),
    fetch_succeeded: fetched ?? null,
    ahead: measurement?.baseExists ? measurement.ahead : null,
    behind: measurement?.baseExists ? measurement.behind : null,
  };
}

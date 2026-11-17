import { MACHINE_CHECK_IDS, type MachineCheckId, type MachineFailureCause, type MachineHelpId, type MachineSnapshot } from '@studio/events';
import type { StringKey } from '@studio/i18n';

/** One phase per check. `failed` is reached only after Onlook tried to fix the check itself. */
type MachinePhase = 'checking' | 'ready' | 'needs-action' | 'acting' | 'failed' | 'unconfirmed';
/** Who acts: Onlook (`install`), the person picking (`choose`), the person sorting it out (`fix`). */
export type MachineRecovery = 'install' | 'choose' | 'fix';

/** The one running action or re-check whose result the screen will accept. */
interface MachineAction {
  id: MachineCheckId;
  kind: MachineRecovery;
  token: number;
}

export interface MachineState {
  snapshot: MachineSnapshot;
  /** The opening run, before any check has answered. */
  checking: boolean;
  action: MachineAction | undefined;
  /** A check Onlook tried to fix itself and could not. */
  stalled: MachineCheckId | undefined;
  /** The check shown on its own. */
  detail: MachineCheckId | undefined;
  notice: StringKey | undefined;
}

export interface MachineRow {
  id: MachineCheckId;
  name: StringKey;
  line: StringKey;
  phase: MachinePhase;
  recovery: MachineRecovery | undefined;
}

const NAMES = { git: 'machine.name.git', workspace: 'machine.name.workspace', port: 'machine.name.port', helper: 'machine.name.helper' } as const;
const READY = { git: 'machine.ready.git', workspace: 'machine.ready.workspace', port: 'machine.ready.port', helper: 'machine.ready.helper' } as const;
const ACTING = { install: 'machine.acting.install', choose: 'machine.acting.choose', fix: 'machine.acting.check' } as const;
const ROW_LINES: Record<MachineFailureCause, StringKey> = {
  git_not_found: 'machine.row.gitNotFound',
  developer_tools_missing: 'machine.row.developerTools',
  git_license_unaccepted: 'machine.row.gitLicense',
  git_config_invalid: 'machine.row.gitConfig',
  git_failed: 'machine.row.gitFailed',
  disk_full: 'machine.row.diskFull',
  permission_denied: 'machine.row.permission',
  workspace_not_writable: 'machine.row.folder',
  no_free_port: 'machine.row.port',
  helper_failed: 'machine.row.helper',
};

/** On a Mac, missing Git and missing developer tools are the same missing thing, and Onlook installs it. */
function machineOnlookInstalls(cause: MachineFailureCause | undefined, platform: MachineSnapshot['platform']): boolean {
  return platform === 'mac' && (cause === 'developer_tools_missing' || cause === 'git_not_found');
}

function machineRecovery(id: MachineCheckId, cause: MachineFailureCause, state: MachineState): MachineRecovery {
  if (id === 'git') return state.stalled !== 'git' && machineOnlookInstalls(cause, state.snapshot.platform) ? 'install' : 'fix';
  if (id === 'workspace') return state.snapshot.canChooseFolder ? 'choose' : 'fix';
  return 'fix';
}

function failureCause(state: MachineState, id: MachineCheckId): MachineFailureCause | undefined {
  const result = state.snapshot.checks.find((check) => check.id === id);
  return result?.status === 'failed' ? result.cause : undefined;
}

export function machineRows(state: MachineState): MachineRow[] {
  return MACHINE_CHECK_IDS.map((id): MachineRow => {
    const name = NAMES[id];
    if (state.action?.id === id) return { id, name, line: ACTING[state.action.kind], phase: 'acting', recovery: undefined };
    const result = state.snapshot.checks.find((check) => check.id === id);
    if (result === undefined) {
      const unanswered = !state.checking;
      return { id, name, line: unanswered ? 'machine.unconfirmed.line' : READY[id], phase: unanswered ? 'unconfirmed' : 'checking', recovery: undefined };
    }
    if (result.status !== 'failed') {
      const ready = result.status === 'passed';
      return { id, name, line: ready ? READY[id] : 'machine.unconfirmed.line', phase: ready ? 'ready' : 'unconfirmed', recovery: undefined };
    }
    const stalled = state.stalled === id;
    const line = stalled ? 'machine.row.installFailed'
      : machineOnlookInstalls(result.cause, state.snapshot.platform) ? 'machine.row.developerTools'
      : ROW_LINES[result.cause];
    return { id, name, line, phase: stalled ? 'failed' : 'needs-action', recovery: machineRecovery(id, result.cause, state) };
  });
}

export interface MachineDetail {
  id: MachineCheckId;
  title: StringKey;
  body: StringKey;
  prompt: StringKey;
  /** Shown when Check again finds the same problem. */
  again: StringKey;
  help: MachineHelpId | undefined;
  helpLabel: StringKey | undefined;
}

const DETAIL_HELP: Partial<Record<MachineFailureCause, { help: MachineHelpId; helpLabel: StringKey }>> = {
  developer_tools_missing: { help: 'developer-tools', helpLabel: 'machine.help.developerTools' },
  no_free_port: { help: 'activity-monitor', helpLabel: 'machine.help.activityMonitor' },
};

// Written out rather than built from the cause, so `check:strings` can see every key this screen renders.
const DETAILS: Record<MachineFailureCause, Omit<MachineDetail, 'id' | 'help' | 'helpLabel'>> = {
  git_not_found: { title: 'machine.detail.gitNotFound.title', body: 'machine.detail.gitNotFound.body', prompt: 'machine.detail.gitNotFound.prompt', again: 'machine.detail.gitNotFound.again' },
  developer_tools_missing: { title: 'machine.detail.developerTools.title', body: 'machine.detail.developerTools.body', prompt: 'machine.detail.developerTools.prompt', again: 'machine.detail.developerTools.again' },
  git_license_unaccepted: { title: 'machine.detail.gitLicense.title', body: 'machine.detail.gitLicense.body', prompt: 'machine.detail.gitLicense.prompt', again: 'machine.detail.gitLicense.again' },
  git_config_invalid: { title: 'machine.detail.gitConfig.title', body: 'machine.detail.gitConfig.body', prompt: 'machine.detail.gitConfig.prompt', again: 'machine.detail.gitConfig.again' },
  git_failed: { title: 'machine.detail.gitFailed.title', body: 'machine.detail.gitFailed.body', prompt: 'machine.detail.gitFailed.prompt', again: 'machine.detail.gitFailed.again' },
  disk_full: { title: 'machine.detail.diskFull.title', body: 'machine.detail.diskFull.body', prompt: 'machine.detail.diskFull.prompt', again: 'machine.detail.diskFull.again' },
  permission_denied: { title: 'machine.detail.permission.title', body: 'machine.detail.permission.body', prompt: 'machine.detail.permission.prompt', again: 'machine.detail.permission.again' },
  workspace_not_writable: { title: 'machine.detail.folder.title', body: 'machine.detail.folder.body', prompt: 'machine.detail.folder.prompt', again: 'machine.detail.folder.again' },
  no_free_port: { title: 'machine.detail.port.title', body: 'machine.detail.port.body', prompt: 'machine.detail.port.prompt', again: 'machine.detail.port.again' },
  helper_failed: { title: 'machine.detail.helper.title', body: 'machine.detail.helper.body', prompt: 'machine.detail.helper.prompt', again: 'machine.detail.helper.again' },
};

/** The check the detail view is showing, or nothing when it has no failure left to explain. */
export function machineDetail(state: MachineState): MachineDetail | undefined {
  const id = state.detail;
  if (id === undefined) return undefined;
  const cause = failureCause(state, id);
  if (cause === undefined) return undefined;
  const resolved = machineOnlookInstalls(cause, state.snapshot.platform) ? 'developer_tools_missing' : cause;
  return { id, ...DETAILS[resolved], ...DETAIL_HELP[resolved] ?? { help: undefined, helpLabel: undefined } };
}

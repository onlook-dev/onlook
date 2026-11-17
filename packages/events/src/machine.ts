import type { HarnessId } from './models.js';

export const MACHINE_CHECK_IDS = ['git', 'workspace', 'port', 'helper'] as const;
export type MachineCheckId = typeof MACHINE_CHECK_IDS[number];
export type MachineFailureCause =
  | 'git_not_found' | 'developer_tools_missing' | 'git_license_unaccepted'
  | 'git_config_invalid' | 'git_failed'
  | 'disk_full' | 'permission_denied' | 'workspace_not_writable' | 'no_free_port' | 'helper_failed';
export type MachineCheck =
  | { id: MachineCheckId; status: 'passed' | 'inconclusive' }
  | { id: MachineCheckId; status: 'failed'; cause: MachineFailureCause };
export interface MachineSnapshot {
  checks: MachineCheck[];
  platform: 'mac' | 'windows' | 'linux';
  canChooseFolder: boolean;
}

/** What `machineInstallTools` watched happen, not what it managed to start (ONL-3111). */
export type MachineInstallResult = 'installed' | 'failed' | 'unsupported';

/** A destination main opens on the person's behalf. The renderer names the place, never a URL or a path. */
export const MACHINE_HELP_IDS = ['developer-tools', 'activity-monitor', 'claude', 'chatgpt'] as const;
export type MachineHelpId = typeof MACHINE_HELP_IDS[number];

/** Where a prompt gets pasted: the agent's own app when it is installed, its site otherwise. */
export const MACHINE_AGENT_HELP: Record<HarnessId, MachineHelpId> = { claude: 'claude', codex: 'chatgpt' };

export function machineHasFailure(checks: readonly MachineCheck[]): boolean {
  return checks.some((check) => check.status === 'failed');
}

import type { MachineFailureCause, MachineSnapshot } from '@studio/events';
import { t, type StringKey } from './index.js';

const FAILURE_COPY = {
  git_not_found: 'machine.failure.git_not_found',
  developer_tools_missing: 'machine.failure.developer_tools_missing',
  git_license_unaccepted: 'machine.failure.git_license_unaccepted',
  git_config_invalid: 'machine.failure.git_config_invalid',
  git_failed: 'machine.failure.git_failed',
  disk_full: 'machine.failure.disk_full',
  permission_denied: 'machine.failure.permission_denied',
  workspace_not_writable: 'machine.failure.workspace_not_writable',
  no_free_port: 'machine.failure.no_free_port',
  helper_failed: 'machine.failure.helper_failed',
} satisfies Record<MachineFailureCause, StringKey>;

export function machineFailureText(cause: MachineFailureCause, platform: MachineSnapshot['platform']): string {
  if (cause === 'git_not_found' && platform === 'mac') return t('machine.failure.developer_tools_missing');
  return t(FAILURE_COPY[cause]);
}

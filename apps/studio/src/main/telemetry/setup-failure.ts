import { isRecord, type HarnessId } from '@studio/events';

export type AgentSetupErrorClass = 'node_missing' | 'npm_missing' | 'npm_install_failed' | 'path_not_found' | 'spawn_eacces' | 'antivirus_blocked' | 'network' | 'sign_in_timeout' | 'provider_refused' | 'not_logged_in' | 'runtime_missing' | 'runtime_invalid' | 'process_exited' | 'invalid_code' | 'agent_error' | 'setup_failed';
export interface SetupFailureInput {
  detail?: string;
  error?: unknown;
  outcome?: string;
  exitCode?: number | null;
}
export interface SetupFailureDiagnostics {
  error_class: AgentSetupErrorClass;
  exit_code: number | null;
}

const FAILURE_PATTERNS: readonly (readonly [RegExp, AgentSetupErrorClass])[] = [
  [/antivirus-blocked|ERROR-VIRUS-INFECTED|ERROR-VIRUS-DELETED|0x800700e1|contains a virus|potentially unwanted software/i, 'antivirus_blocked'],
  [/spawn-eacces|\bEACCES\b|\bEPERM\b|access is denied|permission denied/i, 'spawn_eacces'],
  [/node(?:\.js|\.exe)? (?:is )?(?:not installed|not found|missing)|node-missing/i, 'node_missing'],
  [/npm(?:\.cmd)? (?:is )?(?:not installed|not found|missing)|npm-missing/i, 'npm_missing'],
  [/npm (?:ERR!|error)|npm-install-failed/i, 'npm_install_failed'],
  [/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ERR-NETWORK|fetch failed|network|metadata|download/i, 'network'],
  [/ENOENT|ENOTDIR|path-not-found/i, 'path_not_found'],
  [/sign-in-timeout|timeout|took-too-long|did-not-answer|turn-no-answer/i, 'sign_in_timeout'],
  [/provider-refused|turn-sign-in-rejected|turn-provider-refused|server-rejected/i, 'provider_refused'],
  [/not-logged-in|turn-signed-out/i, 'not_logged_in'],
  [/invalid-code/i, 'invalid_code'],
  [/spawn|runtime-missing/i, 'runtime_missing'],
  [/runtime-invalid|broken|outdated|integrity|unsupported/i, 'runtime_invalid'],
  [/exited/i, 'process_exited'],
  [/turn-|agent-error|agent-busy/i, 'agent_error'],
];

export function classifySetupFailure(input: SetupFailureInput): SetupFailureDiagnostics {
  const record = isRecord(input.error) ? input.error : undefined;
  const text = [input.detail, input.outcome, typeof input.error === 'string' ? input.error : undefined, typeof record?.['code'] === 'string' ? record['code'] : undefined, typeof record?.['message'] === 'string' ? record['message'] : undefined].filter(Boolean).join(' ').replaceAll('_', '-');
  const errorClass = FAILURE_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? 'setup_failed';
  return { error_class: errorClass, exit_code: Number.isSafeInteger(input.exitCode) ? input.exitCode! : null };
}

const failures: Partial<Record<HarnessId, SetupFailureDiagnostics>> = {};

export function rememberSetupFailure(harness: HarnessId, failure?: SetupFailureDiagnostics): void {
  if (failure === undefined) {
    delete failures[harness];
  } else failures[harness] = failure;
}

export function setupFailureContext(harness: HarnessId | undefined): SetupFailureDiagnostics | undefined {
  return harness === undefined ? undefined : failures[harness];
}

import type { CopyFailure, MachineFailureCause } from '@studio/events';
import { StarterFailure, type StarterFailureCause } from '../starter/failure.js';
import type { BlankCreationCause, BlankCreationStep } from '../telemetry/events.js';
import type { GitResult } from './git.js';

export interface BlankCreationFailure {
  failure_step: BlankCreationStep;
  failure_cause: BlankCreationCause;
  exit_code?: number;
  system_error?: string;
}

const DEVELOPER_TOOLS = /^(?:xcode-select|xcrun):/im;
const BAD_CONFIG = /^(?:fatal|error): bad (?:(?:numeric|boolean) )?config/im;
const LICENSE = /(?:agree|accept|review).*(?:Xcode|Apple).*licen[cs]e|(?:Xcode|Apple).*licen[cs]e.*(?:agree|accept|review)/i;
const DISK_FULL = /No space left on device/i;
const NOT_PERMITTED = /Permission denied|Operation not permitted|Read-only file system/i;

/** Why a git run failed, in the vocabulary a check reports; a run that said nothing is `inconclusive` and never blocks (ONL-3111). */
export function gitFailureCause(result: GitResult): MachineFailureCause | 'inconclusive' {
  if (result.timedOut || (result.exitCode === null && !result.missing)) return 'inconclusive';
  if (result.missing) return 'git_not_found';
  if (LICENSE.test(result.err)) return 'git_license_unaccepted';
  if (DEVELOPER_TOOLS.test(result.err)) return 'developer_tools_missing';
  if (BAD_CONFIG.test(result.err)) return 'git_config_invalid';
  if (DISK_FULL.test(result.err)) return 'disk_full';
  if (NOT_PERMITTED.test(result.err)) return 'permission_denied';
  return 'git_failed';
}

export function gitFailure(step: BlankCreationStep, result: GitResult): BlankCreationFailure {
  const cause = gitFailureCause(result);
  return {
    failure_step: step,
    failure_cause: result.timedOut ? 'git_timed_out' : cause === 'inconclusive' ? 'git_failed' : cause,
    ...(result.exitCode === null ? {} : { exit_code: result.exitCode }),
  };
}

const SYSTEM_ERROR_SHAPE = /^E[A-Z0-9]{2,19}$/;

export function systemErrorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' && SYSTEM_ERROR_SHAPE.test(code) ? code : undefined;
}

const NOT_PERMITTED_CODES: ReadonlySet<string> = new Set(['EACCES', 'EPERM', 'EROFS']);

export type ThrownCause = StarterFailureCause | 'disk_full' | 'permission_denied' | 'unknown';

/** What a thrown probe says went wrong: the starter names its own failure, the system its errno. */
export function thrownCause(error: unknown): ThrownCause {
  if (error instanceof StarterFailure) return error.failureCause;
  const code = systemErrorCode(error);
  if (code === 'ENOSPC') return 'disk_full';
  return code !== undefined && NOT_PERMITTED_CODES.has(code) ? 'permission_denied' : 'unknown';
}

export function thrownFailure(step: BlankCreationStep, error: unknown): BlankCreationFailure {
  const cause = thrownCause(error);
  if (error instanceof StarterFailure) {
    return { failure_step: step, failure_cause: cause, ...(error.exitCode === undefined ? {} : { exit_code: error.exitCode }) };
  }
  const code = systemErrorCode(error);
  if (code === undefined) return { failure_step: step, failure_cause: 'unknown' };
  return { failure_step: step, failure_cause: cause === 'unknown' ? 'system_error' : cause, system_error: code };
}

export function copyGitFailure(step: CopyFailure['step'], result: GitResult): CopyFailure {
  const cause = gitFailureCause(result);
  return { step, cause: result.timedOut ? 'git_timed_out' : cause === 'disk_full' || cause === 'permission_denied' || cause === 'git_not_found' ? cause : 'git_failed' };
}

export function copyThrownFailure(step: CopyFailure['step'], error: unknown): CopyFailure {
  const cause = thrownCause(error);
  const code = systemErrorCode(error);
  return { step, cause: cause === 'disk_full' || cause === 'permission_denied' ? cause : code === 'ENOENT' || code === 'ENOTDIR' ? 'folder_unavailable' : 'unknown' };
}

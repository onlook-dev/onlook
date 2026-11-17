import { failureOwner } from '@studio/events';
import { captureError, type ErrorOwner } from '../errors/index.js';
import { messageOf } from '../errors/message.js';
import { capture } from '../telemetry/index.js';

const NETWORK_CODE = /^net::(ERR_[A-Z0-9_]+)/;

export function updateHttpStatus(error: unknown): number | undefined {
  if (error !== null && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  const status = /^(?:HttpError: )?(\d{3})\b/.exec(messageOf(error))?.[1];
  return status === undefined ? undefined : Number(status);
}

export function updateFailureOwner(error: unknown): ErrorOwner {
  if (updateHttpStatus(error) === 403) return 'environment';
  if (/^Code signature at URL .+ did not pass validation\b/i.test(messageOf(error))) return 'environment';
  if (NETWORK_CODE.test(messageOf(error))) return 'environment';
  if (messageOf(error).startsWith('Cannot update while running on a read-only volume.')) return 'environment';
  return failureOwner(error);
}

export function updateFailureReason(error: unknown): string {
  return NETWORK_CODE.exec(messageOf(error))?.[1] ?? 'other';
}

export type UpdateFailureStage = 'check' | 'download' | 'install';

export function reportUpdateFailure(stage: UpdateFailureStage, error: unknown): void {
  captureError(error, { owner: updateFailureOwner(error), subsystem: 'updater' });
  capture('update_check_failed', { stage, reason: updateFailureReason(error) });
}

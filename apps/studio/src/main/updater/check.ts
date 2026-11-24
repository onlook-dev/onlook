import { failureOwner } from '@studio/events';
import { captureError, type ErrorOwner } from '../errors/index.js';
import { messageOf } from '../errors/message.js';
import { capture } from '../telemetry/index.js';

const NETWORK_CODE = /^net::(ERR_[A-Z0-9_]+)/;
const AUTHORIZATION_CODE = /\bOSStatus(?: error)?\s+(-6000[56])\b/i;

export function updateAuthorizationDenied(error: unknown): boolean {
  if (error !== null && typeof error === 'object' && 'code' in error && (error.code === -60005 || error.code === '-60005')) return true;
  return /(?:^|[\s(])(?:OSStatus(?: error)?\s+|Code\s*=\s*)-60005(?=$|[\s)"',;:]|\.(?=$|[\s)]))/i.test(messageOf(error));
}

export function updateHttpStatus(error: unknown): number | undefined {
  if (error !== null && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  const message = messageOf(error);
  const status = /^(?:HttpError: )?(\d{3})\b/.exec(message)?.[1]
    ?? /^Cannot download "[^"\n]+", status (\d{3})\b/.exec(message)?.[1];
  return status === undefined ? undefined : Number(status);
}

export function updateFailureOwner(error: unknown): ErrorOwner {
  const status = updateHttpStatus(error);
  if (status === 403 || (status !== undefined && status >= 500 && status <= 599)) return 'environment';
  if (updateAuthorizationDenied(error) || AUTHORIZATION_CODE.test(messageOf(error))) return 'environment';
  if (/^Code signature at URL .+ did not pass validation\b/i.test(messageOf(error))) return 'environment';
  if (NETWORK_CODE.test(messageOf(error))) return 'environment';
  if (messageOf(error).startsWith('Cannot update while running on a read-only volume.')) return 'environment';
  return failureOwner(error);
}

export function updateFailureReason(error: unknown): string {
  if (updateAuthorizationDenied(error)) return 'authorization-denied';
  if (AUTHORIZATION_CODE.test(messageOf(error))) return 'authorization-canceled';
  return NETWORK_CODE.exec(messageOf(error))?.[1] ?? 'other';
}

export type UpdateFailureStage = 'check' | 'download' | 'install';

export function reportUpdateFailure(stage: UpdateFailureStage, error: unknown): void {
  captureError(error, { owner: updateFailureOwner(error), subsystem: 'updater' });
  capture('update_check_failed', { stage, reason: updateFailureReason(error) });
}

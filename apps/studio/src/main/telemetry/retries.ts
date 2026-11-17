import { RETRY_ERROR_KINDS, type StudioEvent } from '@studio/events';

const RETRY_KINDS: ReadonlySet<string> = new Set(RETRY_ERROR_KINDS);

/** `countsAttempts` is the Harness's own fact: without it `retry_attempts` is `null`, never zero. */
export function retryTelemetry(events: readonly StudioEvent[], countsAttempts: boolean, from = 0): {
  retry_attempts: number | null;
  retry_observed_count: number;
  retry_last_status: number | null;
  retry_error_kind: string | null;
} {
  let observed = 0;
  let status: number | null = null;
  let kind: string | null = null;
  for (let index = events.length - 1; index >= from; index--) {
    const event = events[index]!;
    if (event.type === 'turn.ended') break;
    if (event.type !== 'session.retrying') continue;
    if (observed === 0) {
      status = event.status !== null && Number.isInteger(event.status) && event.status >= 100 && event.status <= 599 ? event.status : null;
    }
    if (kind === null && event.kind !== undefined && RETRY_KINDS.has(event.kind)) kind = event.kind;
    observed++;
  }
  return {
    retry_attempts: countsAttempts ? observed : null,
    retry_observed_count: observed,
    retry_last_status: status,
    retry_error_kind: kind,
  };
}

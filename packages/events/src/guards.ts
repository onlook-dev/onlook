import type { StudioEvent, TranscriptItem } from './events.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** A prompt Studio pushed on the user's behalf is a row, not the user speaking (ONL-2198). */
export function isUserSpoken(event: StudioEvent): boolean {
  return event.type === 'message.user' && event.origin !== 'studio';
}

/** `origin` is absent on rows that predate the field, and those are the user's. */
export function isUserSpokenItem(item: TranscriptItem): boolean {
  return item.kind === 'user' && item.origin !== 'studio';
}

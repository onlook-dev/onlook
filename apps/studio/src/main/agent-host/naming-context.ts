import { isUserSpoken, type DisplayNameSource, type StudioEvent } from '@studio/events';
import { renameInstruction } from '../../instructions/naming.js';

/** Read before the prompt is pushed (ONL-2181); a `message.user` with no `origin` predates the field and is the user's. */
export function namingContextFor(
  events: readonly StudioEvent[],
  record: { displayName?: string; displayNameSource?: DisplayNameSource } | undefined,
): string | undefined {
  if (record === undefined) return undefined;
  if (record.displayNameSource !== 'provisional' && (record.displayNameSource !== undefined || record.displayName !== undefined)) return undefined;
  const spoken = events.some(isUserSpoken);
  return spoken ? undefined : renameInstruction();
}

export function joinNamingContext(context: string | undefined, naming: string | undefined): string | undefined {
  const parts = [context, naming].filter((part): part is string => part !== undefined && part !== '');
  return parts.length === 0 ? undefined : parts.join('\n\n');
}

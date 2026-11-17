import type { StudioEvent } from '@studio/events';

export function artifactCodebaseTarget(event: StudioEvent, events: readonly StudioEvent[]): { count: number } | null {
  if (event.type !== 'turn.ended' || (event.filesChanged ?? 0) < 1) return null;
  const start = events.findLast((candidate) => candidate.type === 'turn.started' && candidate.turnId === event.turnId && candidate.seq < event.seq);
  if (start === undefined) return null;
  const preceding = events.findLast((candidate) => candidate.type === 'message.user' && candidate.seq < start.seq);
  const references = new Set<string>();
  for (const candidate of events) {
    if (candidate.type !== 'message.user' || candidate.seq >= event.seq || candidate.seq < (preceding?.seq ?? start.seq)) continue;
    for (const attachment of candidate.attachments ?? []) {
      if ('kind' in attachment && attachment.kind === 'artifact') references.add(attachment.artifactId);
    }
  }
  return references.size === 0 ? null : { count: references.size };
}

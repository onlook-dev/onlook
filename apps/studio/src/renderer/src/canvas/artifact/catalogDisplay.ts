import type { ArtifactSummary } from '@studio/events';

export function recentArtifacts(records: readonly ArtifactSummary[], query = '', ranks?: ReadonlyMap<string, number>): ArtifactSummary[] {
  const needle = query.trim().toLowerCase();
  // Names filter at once; page-text matches join when the search answers, so the list never empties while it waits (ONL-2593).
  return records.filter((artifact) => needle === '' || ranks?.has(artifact.id) || [artifact.title, ...(artifact.pages ?? []).map((page) => page.name)].some((value) => value.toLowerCase().includes(needle)))
    .sort((left, right) => (needle === '' ? 0 : (ranks?.get(left.id) ?? 0) - (ranks?.get(right.id) ?? 0)) || (Date.parse(right.updatedAt) || 0) - (Date.parse(left.updatedAt) || 0) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

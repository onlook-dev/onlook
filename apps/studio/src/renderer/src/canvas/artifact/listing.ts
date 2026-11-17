import { create } from 'zustand';
import type { ArtifactSummary } from '@studio/events';
import { forgetArtifact } from './artifactCache.js';
import { artifactPreviewDemand } from './previewDemand.js';
import { studio } from '../../bridge.js';

export const useArtifactListing = create<{
  records: ArtifactSummary[] | null;
  error: boolean;
  deletingIds: string[];
  deleteFailures: string[];
}>()(() => ({ records: null, error: false, deletingIds: [], deleteFailures: [] }));

const deleting = new Set<string>();

let priming: Promise<void> | undefined;
let reading: Promise<void> | undefined;
let revision = 0;
let unsubscribe: (() => void) | undefined;

export function refreshArtifactListing(): Promise<void> {
  revision += 1;
  if (reading !== undefined) return reading;
  reading = (async () => {
    let observed: number;
    do {
      observed = revision;
      try {
        const records = await studio().artifactList();
        if (observed === revision) {
          artifactPreviewDemand.retain(records.map((record) => record.id));
          useArtifactListing.setState({ records: records.filter((record) => !deleting.has(record.id)), error: false });
        }
      } catch {
        if (observed === revision) useArtifactListing.setState({ error: true });
      }
    } while (observed !== revision);
  })().finally(() => { reading = undefined; });
  return reading;
}

export function primeArtifactListing(): Promise<void> {
  if (priming !== undefined) return priming;
  unsubscribe = studio().onArtifactChanged(({ artifactId }) => {
    artifactPreviewDemand.invalidate(artifactId);
    forgetArtifact(artifactId);
    void refreshArtifactListing();
  });
  priming = refreshArtifactListing();
  return priming;
}

export function resetArtifactListingForTests(): void {
  unsubscribe?.();
  unsubscribe = undefined;
  priming = undefined;
  reading = undefined;
  revision = 0;
  deleting.clear();
  useArtifactListing.setState({ records: null, error: false, deletingIds: [], deleteFailures: [] });
}

export async function deleteListedArtifact(artifactId: string, updatedAt?: string): Promise<boolean> {
  if (deleting.has(artifactId)) return false;
  const record = useArtifactListing.getState().records?.find((artifact) => artifact.id === artifactId);
  if (record?.readOnly) return false;
  deleting.add(artifactId);
  useArtifactListing.setState((state) => ({
    records: state.records?.filter((artifact) => artifact.id !== artifactId) ?? null,
    deletingIds: [...deleting],
    deleteFailures: state.deleteFailures.filter((id) => id !== artifactId),
  }));
  let removed = false;
  try {
    removed = !('code' in await studio().artifactDelete({ artifactId, ...(updatedAt === undefined ? {} : { updatedAt }) }));
    if (removed) await refreshArtifactListing();
  } catch {
    removed = false;
  } finally {
    deleting.delete(artifactId);
    useArtifactListing.setState((state) => ({
      deletingIds: [...deleting],
      ...(!removed ? {
        records: record !== undefined && !state.records?.some((artifact) => artifact.id === artifactId)
          ? [...(state.records ?? []), record] : state.records,
        deleteFailures: [...state.deleteFailures, artifactId],
      } : {}),
    }));
  }
  if (!removed) await refreshArtifactListing();
  return removed;
}

/** Renames the artifact itself, which every placement shows. The new title shows at once and reverts only if the store refuses (ONL-2593). */
export async function renameArtifactTitle(artifactId: string, title: string): Promise<boolean> {
  const record = useArtifactListing.getState().records?.find((artifact) => artifact.id === artifactId);
  const next = title.trim();
  if (record === undefined || record.readOnly || next === '' || next === record.title) return false;
  const setTitle = (value: string): void => {
    useArtifactListing.setState((state) => ({
      records: state.records?.map((artifact) => (artifact.id === artifactId ? { ...artifact, title: value } : artifact)) ?? null,
    }));
  };
  const send = async (updatedAt: string): Promise<string> => {
    try {
      return (await studio().artifactRename({ artifactId: record.id, title: next, updatedAt })).outcome;
    } catch {
      return 'unavailable';
    }
  };
  setTitle(next);
  let outcome = await send(record.updatedAt);
  // An agent edit landing mid-rename bumps the same `updatedAt`, and the designer just typed this title: it wins one retry (ONL-2645).
  if (outcome === 'stale') {
    await refreshArtifactListing();
    const fresh = useArtifactListing.getState().records?.find((artifact) => artifact.id === artifactId);
    if (fresh !== undefined && !fresh.readOnly) {
      setTitle(next);
      outcome = await send(fresh.updatedAt);
    }
  }
  const saved = outcome === 'saved';
  if (!saved && useArtifactListing.getState().records?.find((artifact) => artifact.id === artifactId)?.title === next) setTitle(record.title);
  return saved;
}

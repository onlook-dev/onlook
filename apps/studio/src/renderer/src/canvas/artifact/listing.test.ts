import { afterEach, beforeEach, expect, it } from 'bun:test';
import type { ArtifactSummary } from '@studio/events';
import { deleteListedArtifact, primeArtifactListing, refreshArtifactListing, renameArtifactTitle, resetArtifactListingForTests, useArtifactListing } from './listing.js';

const artifact: ArtifactSummary = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', title: 'Pricing', pagePath: 'pages/index.html', updatedAt: '', readOnly: false };
const originalWindow = globalThis.window;
let reads: { resolve(value: ArtifactSummary[]): void; reject(error: Error): void }[];
let changed: ((event: { artifactId: string }) => void) | undefined;
let subscriptions: number;
let unsubscribed: number;

beforeEach(() => {
  resetArtifactListingForTests();
  reads = [];
  subscriptions = 0;
  unsubscribed = 0;
  globalThis.window = { studio: {
    artifactList: () => new Promise<ArtifactSummary[]>((resolve, reject) => { reads.push({ resolve, reject }); }),
    onArtifactChanged: (listener: typeof changed) => { subscriptions += 1; changed = listener; return () => { unsubscribed += 1; }; },
  } } as unknown as Window & typeof globalThis;
});
afterEach(() => {
  resetArtifactListingForTests();
  globalThis.window = originalWindow;
});

it('hides a confirmed artifact before deletion settles and restores a refused deletion (ONL-2873)', async () => {
  useArtifactListing.setState({ records: [artifact] });
  const deletion = Promise.withResolvers<{ code: 'stale' }>();
  window.studio.artifactDelete = () => deletion.promise as ReturnType<typeof window.studio.artifactDelete>;
  const pending = deleteListedArtifact(artifact.id, artifact.updatedAt);
  expect(useArtifactListing.getState().records).toEqual([]);
  const refresh = refreshArtifactListing();
  reads[0]!.resolve([artifact]);
  await refresh;
  expect(useArtifactListing.getState().records).toEqual([]);
  deletion.resolve({ code: 'stale' });
  await Promise.resolve();
  reads[1]!.resolve([{ ...artifact, updatedAt: 'new-version' }]);
  expect(await pending).toBe(false);
  expect(useArtifactListing.getState().records).toEqual([{ ...artifact, updatedAt: 'new-version' }]);
  expect(useArtifactListing.getState().deleteFailures).toContain(artifact.id);
});

it('keeps concurrent removals hidden through refresh and restores only the rejected artifact (ONL-2873)', async () => {
  const second = { ...artifact, id: 'bbbbbbbb-1111-4111-8111-aaaaaaaaaaaa' };
  const added = { ...artifact, id: 'cccccccc-1111-4111-8111-aaaaaaaaaaaa' };
  useArtifactListing.setState({ records: [artifact, second] });
  const firstDelete = Promise.withResolvers<{ ok: true }>();
  const secondDelete = Promise.withResolvers<{ ok: true }>();
  window.studio.artifactDelete = ({ artifactId }) => artifactId === artifact.id ? firstDelete.promise : secondDelete.promise;
  const first = deleteListedArtifact(artifact.id);
  const other = deleteListedArtifact(second.id);
  expect(useArtifactListing.getState().records).toEqual([]);
  expect(await deleteListedArtifact(artifact.id)).toBe(false);
  secondDelete.reject(new Error('unavailable'));
  await Promise.resolve();
  reads[0]!.resolve([artifact, second]);
  expect(await other).toBe(false);
  expect(useArtifactListing.getState().records).toEqual([second]);
  firstDelete.resolve({ ok: true });
  await Promise.resolve();
  reads[1]!.resolve([second, added]);
  expect(await first).toBe(true);
  expect(useArtifactListing.getState().records).toEqual([second, added]);
  expect(useArtifactListing.getState().deletingIds).toEqual([]);
});

it('does not delete read-only artifacts (ONL-2873)', async () => {
  const readOnly = { ...artifact, readOnly: true };
  useArtifactListing.setState({ records: [readOnly] });
  expect(await deleteListedArtifact(artifact.id)).toBe(false);
  expect(useArtifactListing.getState().records).toEqual([readOnly]);
});

it('primes once without turning unresolved records into absence, including newer readers', async () => {
  const first = primeArtifactListing();
  expect(primeArtifactListing()).toBe(first);
  expect(subscriptions).toBe(1);
  expect(reads).toHaveLength(1);
  expect(useArtifactListing.getState()).toEqual({ records: null, error: false, deletingIds: [], deleteFailures: [] });
  reads[0]!.resolve([{ ...artifact, readOnly: true }]);
  await first;
  expect(useArtifactListing.getState().records).toEqual([{ ...artifact, readOnly: true }]);
});

it('coalesces cross-tab changes and discards a stale read before the authoritative refresh', async () => {
  const ready = primeArtifactListing();
  changed!({ artifactId: artifact.id });
  changed!({ artifactId: artifact.id });
  expect(reads).toHaveLength(1);
  reads[0]!.resolve([]);
  await Promise.resolve();
  expect(useArtifactListing.getState().records).toBeNull();
  expect(reads).toHaveLength(2);
  reads[1]!.resolve([artifact]);
  await ready;
  expect(useArtifactListing.getState().records).toEqual([artifact]);
  changed!({ artifactId: artifact.id });
  reads[2]!.resolve([]);
  await refreshArtifactListingAfterEvent();
  expect(useArtifactListing.getState().records).toEqual([]);
  expect(subscriptions).toBe(1);
});

async function refreshArtifactListingAfterEvent(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

it('re-sends a rename the agent’s own edit refused as stale, so the typed title is not lost', async () => {
  const asked: string[] = [];
  const rename = async ({ updatedAt }: { updatedAt: string }): Promise<unknown> => {
    asked.push(updatedAt);
    return updatedAt === 'two'
      ? { outcome: 'saved', artifact: { ...artifact, title: 'Checkout', updatedAt: 'three' } }
      : { outcome: 'stale' };
  };
  (globalThis.window.studio as unknown as { artifactRename: typeof rename }).artifactRename = rename;
  const ready = primeArtifactListing();
  reads[0]!.resolve([{ ...artifact, updatedAt: 'one' }]);
  await ready;
  const renamed = renameArtifactTitle(artifact.id, 'Checkout');
  for (let tick = 0; tick < 50 && reads.length < 2; tick += 1) await new Promise((settle) => setTimeout(settle, 0));
  reads[1]!.resolve([{ ...artifact, title: 'A title the agent wrote', updatedAt: 'two' }]);
  expect(await renamed).toBe(true);
  expect(asked).toEqual(['one', 'two']);
  expect(useArtifactListing.getState().records?.[0]?.title).toBe('Checkout');
});

it('retains known records on errors and recovers on an explicit retry, not a poller', async () => {
  const ready = primeArtifactListing();
  reads[0]!.resolve([artifact]);
  await ready;
  const failed = refreshArtifactListing();
  reads[1]!.reject(new Error('unavailable'));
  await failed;
  expect(useArtifactListing.getState()).toEqual({ records: [artifact], error: true, deletingIds: [], deleteFailures: [] });
  const retry = refreshArtifactListing();
  reads[2]!.resolve([]);
  await retry;
  expect(useArtifactListing.getState()).toEqual({ records: [], error: false, deletingIds: [], deleteFailures: [] });
  resetArtifactListingForTests();
  expect(unsubscribed).toBe(1);
});

it('shows a first-read error as unknown and admits later creation', async () => {
  const ready = primeArtifactListing();
  reads[0]!.reject(new Error('unavailable'));
  await ready;
  expect(useArtifactListing.getState()).toEqual({ records: null, error: true, deletingIds: [], deleteFailures: [] });
  changed!({ artifactId: artifact.id });
  reads[1]!.resolve([artifact]);
  await refreshArtifactListingAfterEvent();
  expect(useArtifactListing.getState()).toEqual({ records: [artifact], error: false, deletingIds: [], deleteFailures: [] });
});

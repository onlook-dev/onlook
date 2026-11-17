import { randomUUID } from 'node:crypto';
import type { CanvasDocId } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { normalizePath, workspaceRoot } from '../workspace/store.js';
import type { CanvasDocLoad, CanvasDocumentStore } from './adapter.js';

interface CanvasRegistryState {
  documents: Record<string, CanvasDocId>;
}

const domain = defineDomain<CanvasRegistryState>({
  name: 'canvas-registry',
  version: 1,
  fallback: () => ({ documents: {} }),
  root: workspaceRoot,
});

export function canvasDocIdFor(worktreePath: string): CanvasDocId {
  const key = normalizePath(worktreePath);
  const existing = domain.read().documents[key];
  if (existing !== undefined) return existing;
  const minted: CanvasDocId = randomUUID();
  domain.update((state) => ({ documents: { ...state.documents, [key]: minted } }));
  return minted;
}

/** Never mints: asking about a project is not opening it. */
export function knownCanvasDocId(worktreePath: string): CanvasDocId | undefined {
  return domain.read().documents[normalizePath(worktreePath)];
}

export function worktreeForCanvasDoc(docId: CanvasDocId): string | undefined {
  const documents = domain.read().documents;
  for (const [worktree, held] of Object.entries(documents)) {
    if (held === docId) return worktree;
  }
  return undefined;
}

export function rebindCanvasDoc(worktreePath: string, docId: CanvasDocId): void {
  const key = normalizePath(worktreePath);
  domain.update((state) => ({ documents: { ...state.documents, [key]: docId } }));
}

/** The association only; the file is `deleteCanvasDocFiles`' (ONL-2152). */
export function forgetCanvasDoc(worktreePath: string): void {
  const key = normalizePath(worktreePath);
  domain.update((state) => {
    if (state.documents[key] === undefined) return state;
    const documents = { ...state.documents };
    delete documents[key];
    return { documents };
  });
}

export async function openCanvasDoc(
  worktreePath: string,
  store: CanvasDocumentStore,
): Promise<CanvasDocLoad> {
  const loaded = await store.load(canvasDocIdFor(worktreePath));
  if (loaded.outcome === 'recovered') rebindCanvasDoc(worktreePath, loaded.doc.docId);
  return loaded;
}

export function resetCanvasRegistryCache(): void {
  domain.reset();
}

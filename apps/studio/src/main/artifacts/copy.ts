import type { ArtifactRefusal, ArtifactSummary, CanvasOp } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import { artifactPrivacyIssues } from './privacy.js';
import { manifestPagePath } from './manifest.js';

export async function forkArtifact(store: ArtifactStore, sourceId: string, title: string, projectNames?: readonly string[]): Promise<ArtifactSummary | ArtifactRefusal> {
  const source = await store.read(sourceId);
  const bundle = await store.readFiles(sourceId);
  if (source.outcome !== 'resolved' || source.readOnly || 'code' in bundle || artifactPrivacyIssues(bundle, projectNames).length > 0) {
    return {code: 'invalidFiles', reason: 'The artifact could not be copied safely. Nothing was created.'};
  }
  const current = await store.read(sourceId);
  if (current.outcome !== 'resolved' || current.readOnly || current.manifest.updatedAt !== source.manifest.updatedAt) {
    return {code: 'stale', reason: 'The artifact changed while preparing the copy. Read it again before forking.'};
  }
  return store.create({title, copiedFrom: sourceId, html: '', bundle, dimensions: current.manifest.dimensions});
}

/** Placement, duplicate and paste all share the source identity; only the agent's explicit fork copies (ONL-2568). */
export async function prepareArtifactPlacements(store: ArtifactStore, ops: readonly CanvasOp[], options: { reuseDimensions?: boolean } = {}): Promise<
  { ok: true; ops: CanvasOp[] } | { ok: false; reason: string }
> {
  const placed: CanvasOp[] = [];
  for (const op of ops) {
    if ((op.type !== 'create' && op.type !== 'duplicate') || typeof op.node !== 'object' || op.node === null || op.node.kind !== 'artifact') {
      placed.push(op);
      continue;
    }
    const content = op.node.content;
    const source = typeof content === 'object' && content !== null ? await store.read(content.artifactId) : {outcome: 'missing' as const};
    if (source.outcome !== 'resolved' || source.readOnly || manifestPagePath(source.manifest, content.pagePath) === undefined) {
      return {ok: false, reason: 'Choose a readable artifact document from the catalog. Nothing was placed.'};
    }
    const titled = {...content, title: source.manifest.title};
    // Spelled per type so a duplicate keeps its provenance-bearing node type.
    placed.push(op.type === 'create' ? {...op, node: {...op.node, ...(options.reuseDimensions === false ? {} : source.manifest.dimensions), content: titled}} : {...op, node: {...op.node, content: titled}});
  }
  return {ok: true, ops: placed};
}

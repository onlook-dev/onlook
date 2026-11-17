import {artifactRefusal, isArtifactId, type ArtifactDeleteResult} from '@studio/events';
import type {ArtifactStore} from './adapter.js';
import {artifactRendererAdmitted} from './preview-admission.js';

export function createArtifactDeleteHandler(deps: {renderers(): readonly Electron.WebContents[]; store: Pick<ArtifactStore, 'remove' | 'read'>; changed(id: string): void}) {
  return async (event: {sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null}, request: {artifactId: string; updatedAt?: string}): Promise<ArtifactDeleteResult> => {
    const wanted = () => artifactRendererAdmitted(event, deps.renderers());
    if (!wanted()) return artifactRefusal('unavailable');
    if (!request || !isArtifactId(request.artifactId) || (request.updatedAt !== undefined && (typeof request.updatedAt !== 'string' || request.updatedAt.length > 100))) return artifactRefusal('badId');
    try {
      const read = await deps.store.read(request.artifactId);
      if (!wanted()) return artifactRefusal('unavailable');
      if (read.outcome !== 'resolved') return artifactRefusal('unknown');
      if (read.readOnly) return artifactRefusal(read.manifest.pages.length > 1 || (read.blockedDocuments ?? 0) > 0 ? 'multipleDocuments' : 'newerBuild');
      if (request.updatedAt !== undefined && request.updatedAt !== read.manifest.updatedAt) return artifactRefusal('stale');
      const result = await deps.store.remove(request.artifactId, read.manifest.updatedAt);
      if ('ok' in result) deps.changed(request.artifactId);
      return wanted() ? result : artifactRefusal('unavailable');
    } catch {return artifactRefusal('unavailable');}
  };
}

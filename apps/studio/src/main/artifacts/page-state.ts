import { artifactPageUrl, isArtifactId, type ArtifactPageState, type ArtifactPreviewRequest } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import { artifactRendererAdmitted } from './preview-admission.js';

export function createArtifactPageStateHandler(deps: {
  renderers(): readonly Electron.WebContents[];
  store: Pick<ArtifactStore, 'read' | 'readPage'>;
  revision(artifactId: string): number;
}) {
  return async (event: { sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null }, request: ArtifactPreviewRequest): Promise<ArtifactPageState> => {
    const wanted = () => artifactRendererAdmitted(event, deps.renderers());
    if (!wanted() || typeof request !== 'object' || request === null || !isArtifactId(request.artifactId) || typeof request.pagePath !== 'string' || request.pagePath.length > 240 || typeof request.updatedAt !== 'string' || request.updatedAt.length > 100) return {outcome: 'unavailable'};
    const revision = deps.revision(request.artifactId);
    try {
      const read = await deps.store.read(request.artifactId);
      if (read.outcome !== 'resolved') return {outcome: 'missing'};
      if (read.manifest.updatedAt !== request.updatedAt) return {outcome: 'stale'};
      if (!read.manifest.pages.some((page) => page.path === request.pagePath) || await deps.store.readPage(request.artifactId, request.pagePath) === null) return {outcome: 'missing'};
      if (!wanted() || deps.revision(request.artifactId) !== revision) return {outcome: 'stale'};
      return {outcome: 'ready', url: artifactPageUrl(request.artifactId, request.pagePath)};
    } catch { return {outcome: 'unavailable'}; }
  };
}

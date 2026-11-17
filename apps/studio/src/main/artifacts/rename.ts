import { isArtifactId, type ArtifactRenameRequest, type ArtifactRenameResult } from '@studio/events';
import type { ArtifactStore } from './adapter.js';
import { artifactRendererAdmitted } from './preview-admission.js';

export function createArtifactRenameHandler(deps: {
  renderers(): readonly Electron.WebContents[];
  store: Pick<ArtifactStore, 'rename' | 'read'>;
  changed(artifactId: string): void;
}) {
  return async (event: {sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null}, request: ArtifactRenameRequest): Promise<ArtifactRenameResult> => {
    const admitted = () => artifactRendererAdmitted(event, deps.renderers());
    if (!admitted()) return {outcome: 'unavailable'};
    if (!request || !isArtifactId(request.artifactId) || typeof request.title !== 'string' || request.title.trim().length === 0 || request.title.trim().length > 200 || /[\u0000-\u001f\u007f]/.test(request.title) || typeof request.updatedAt !== 'string' || request.updatedAt.length > 100) return {outcome: 'invalid'};
    try {
      const result = await deps.store.rename(request.artifactId, request.title.trim(), request.updatedAt);
      if ('code' in result) return {outcome: result.code === 'newerBuild' || result.code === 'multipleDocuments' ? 'readOnly' : result.code === 'stale' ? 'stale' : 'unavailable'};
      deps.changed(request.artifactId);
      const read = await deps.store.read(request.artifactId);
      if (!admitted() || read.outcome !== 'resolved' || read.manifest.title !== request.title.trim()) return {outcome: 'stale'};
      const manifest = read.manifest;
      return {outcome: 'saved', artifact: {id: manifest.id, title: manifest.title, pagePath: manifest.pages[0]!.path, pages: manifest.pages, updatedAt: manifest.updatedAt, readOnly: read.readOnly}};
    } catch { return {outcome: 'unavailable'}; }
  };
}

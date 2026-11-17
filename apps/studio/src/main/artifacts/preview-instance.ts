import { artifactStore } from './instance.js';
import { createArtifactPreviewService } from './preview-cache.js';
import { onArtifactContentChanged } from './changes.js';
import { createPreviewDisk } from './preview-disk.js';
import { stateRoot } from '../state/root.js';

let previews: ReturnType<typeof createArtifactPreviewService> | undefined;

export function installArtifactPreviews(capture: Parameters<typeof createArtifactPreviewService>[0]['capture']): ReturnType<typeof createArtifactPreviewService> {
  if (previews === undefined) {
    previews = createArtifactPreviewService({ store: artifactStore(), capture, disk: createPreviewDisk(stateRoot()) });
    onArtifactContentChanged((artifactId) => previews?.invalidate(artifactId));
  }
  return previews;
}

export function artifactPreviews(): ReturnType<typeof createArtifactPreviewService> {
  if (previews === undefined) throw new Error('artifact previews are not installed');
  return previews;
}

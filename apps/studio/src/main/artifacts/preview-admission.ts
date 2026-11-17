import type { ArtifactPreviewRequest, ArtifactPreviewResult } from '@studio/events';

type Sender = Pick<Electron.WebContents, 'isDestroyed' | 'mainFrame'>;
type Event = { sender: Sender; senderFrame: Electron.WebFrameMain | null };

export function artifactRendererAdmitted(event: Event, renderers: readonly Sender[]): boolean {
  return !event.sender.isDestroyed() && event.senderFrame !== null &&
    event.senderFrame === event.sender.mainFrame && renderers.includes(event.sender);
}

export function createArtifactPreviewHandler(deps: {
  renderers(): readonly Sender[];
  request(request: ArtifactPreviewRequest, wanted: () => boolean): Promise<ArtifactPreviewResult>;
}) {
  return (event: Event, request: ArtifactPreviewRequest): Promise<ArtifactPreviewResult> => {
    const wanted = () => artifactRendererAdmitted(event, deps.renderers());
    if (!wanted()) return Promise.resolve({ outcome: 'unavailable' });
    return deps.request(request, wanted);
  };
}

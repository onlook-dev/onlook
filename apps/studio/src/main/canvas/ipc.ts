import { handle, on } from '../ipc/bridge.js';
import { onArtifactContentChanged } from '../artifacts/changes.js';
import { IPC_INVOKE, IPC_SEND } from '@studio/events';
import { setProjectThumbnailProvider } from '../workspace/store.js';
import { readCanvasPageCameras, writeCanvasCamera } from './camera.js';
import { installFrameMirror } from './mirror.js';
import { primeThumbnailIndex } from './thumbnail/store.js';
import { projectThumbnailUrl, setCanvasSnapshotProvider } from './thumbnail/index.js';
import { host, snapshotOf, canvasPagedSnapshotFor, setCanvasCurrentPage } from './host.js';

export function registerCanvasHandlers(): void {
  installFrameMirror();
  onArtifactContentChanged((artifactId) => host.artifactChanged(artifactId));
  setCanvasSnapshotProvider(canvasPagedSnapshotFor);
  setProjectThumbnailProvider(projectThumbnailUrl);
  // One sweep at init: a write-only index answers absent for every project a returning user has (ONL-2471).
  primeThumbnailIndex();
  // The door has matched each request's `docId` to the sending view's own document.
  handle(IPC_INVOKE.canvasSnapshot, (project) => snapshotOf(project.root), () => ({ doc: null }));
  handle(IPC_INVOKE.canvasPageCameras, (_project, request) => ({ byPage: readCanvasPageCameras(request.docId) }), () => ({ byPage: {} }));
  on(IPC_SEND.canvasOp, (_project, request) => {
    void host.handleOpRequest(request);
  });
  on(IPC_SEND.canvasUndo, (_project, request) => {
    void host.undo(request.docId);
  });
  on(IPC_SEND.canvasRedo, (_project, request) => {
    void host.redo(request.docId);
  });
  on(IPC_SEND.canvasViewport, (_project, save) => {
    if (typeof save.pageId === 'string') writeCanvasCamera(save.docId, save.pageId, save.camera);
  });
  on(IPC_SEND.canvasCurrentPage, (_project, save) => {
    if (typeof save.pageId === 'string') void setCanvasCurrentPage(save.docId, save.pageId);
  });
}

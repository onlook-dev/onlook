import { dialog, webContents } from 'electron';
import { handle } from '../ipc/bridge.js';
import { basename } from 'node:path';
import { exportArtifact, type ArtifactExportRefusal } from './export.js';
import { dialogParent } from '../window/host.js';
import { writeAtomicFile } from '../fs-atomic.js';
import { broadcastToRenderers } from '../tabs/broadcast.js';
import { workspaceOf } from '../tabs/views.js';
import { knownProject } from '../workspace/store.js';
import { capture } from '../telemetry/index.js';
import { t } from '@studio/i18n';
import {
  IPC_INVOKE,
  IPC_EMIT,
  artifactPageUrl,
  type ArtifactCreated,
  type ArtifactId,
  type ArtifactSummary,
  isArtifactId,
} from '@studio/events';
import { artifactStore } from './instance.js';
import { artifactsSession, installArtifactSessionPolicies } from './session.js';
import { starterPage } from './starter.js';
import { captureArtifactPreview } from './preview.js';
import { installArtifactPreviews } from './preview-instance.js';
import { onArtifactContentChanged } from './changes.js';
import { createArtifactPreviewHandler, artifactRendererAdmitted } from './preview-admission.js';
import { tabHost } from '../tabs/host.js';
import { joinArtifactPdf, printArtifactPage } from './pdf.js';
import { createArtifactPickHandler } from './pick.js';
import { createArtifactTextHandlers } from './text.js';
import { createArtifactPageStateHandler } from './page-state.js';
import { canvasSnapshotFor } from '../canvas/index.js';
import { createArtifactRenameHandler } from './rename.js';
import { createArtifactSearchHandler, createArtifactTextSearch } from './search.js';
import { createArtifactDeleteHandler } from './delete.js';
import { recordArtifactAction } from './telemetry.js';
import { manifestPagePath } from './manifest.js';
import { createImageExportHandler } from '../canvas/image-export.js';
import { captureExportImage } from '../canvas/image-capture.js';
import { frameBindings } from '../frames/bindings.js';
import { createFrameAttachHandler } from '../canvas/frame-attach.js';
import { createFrameReadyHandler } from '../canvas/frame-ready.js';
import { framesSession } from '../frames/partition.js';
import { ARTIFACT_PREVIEW_SIZE, withArtifactPageContents } from './preview.js';
import { artifactRenderQueue } from './render-queue.js';
import { IMAGE_EXPORT_FORMATS, imageCaptureFailure, imageExportName } from '../canvas/image-export.js';
import { createImageTargetResolver } from '../canvas/image-target.js';

function exportRefusalMessage(reason: ArtifactExportRefusal): string {
  switch (reason) {
    case 'missing': return t('artifact.export.missing');
    case 'newer-reader': return t('artifact.export.newerReader');
    case 'files': return t('artifact.export.files');
    case 'privacy': return t('artifact.export.privacy');
    case 'references': return t('artifact.export.references');
    case 'too-large': return t('artifact.export.tooLarge');
  }
}

export function installArtifacts(): void {
  const renderers = () => tabHost()?.everyRenderer() ?? [];
  // Each handler below looks the sender up again after every wait: the view may have left the Project meanwhile.
  const frameReady = createFrameReadyHandler<Electron.IpcMainInvokeEvent>({
    admitted: event => artifactRendererAdmitted(event, renderers()),
    workspace: workspaceOf,
    snapshot: canvasSnapshotFor,
    readiness: (sender, docId, node, webContentsId) => frameBindings.readiness(sender, docId, node, webContentsId),
  });
  handle(IPC_INVOKE.canvasFrameReady, (_project, request, event) => frameReady(event, request), () => 'pending');
  const frameAttach = createFrameAttachHandler<Electron.IpcMainInvokeEvent>({
    admitted: event => artifactRendererAdmitted(event, renderers()),
    workspace: workspaceOf,
    snapshot: canvasSnapshotFor,
    browserUrl: (sender, docId, node) => frameBindings.browserUrl(sender, docId, node),
    artifactUrl: async node => {
      const read = await artifactStore().read(node.content.artifactId);
      const path = read.outcome === 'resolved' ? manifestPagePath(read.manifest, node.content.pagePath) : undefined;
      return path === undefined ? undefined : artifactPageUrl(node.content.artifactId, path);
    },
    issue: (sender, docId, node, url) => frameBindings.issue(sender, docId, node, url),
  });
  handle(IPC_INVOKE.canvasFrameAttach, (_project, request, event) => frameAttach(event, request), () => null);
  const exportImage = createImageExportHandler<Electron.IpcMainInvokeEvent>({
    admitted: event => artifactRendererAdmitted(event, renderers()),
    target: createImageTargetResolver({
      admitted: event => artifactRendererAdmitted(event, renderers()),
      workspace: workspaceOf,
      snapshot: canvasSnapshotFor,
      boundGuest: (sender, docId, node, pageUrl) => frameBindings.guest(sender, docId, node, pageUrl) as Electron.WebContents | undefined,
      session: kind => kind === 'artifact' ? artifactsSession() : framesSession(),
      artifact: async (id, pagePath) => {
        const revision = previews.revision(id);
        const read = await artifactStore().read(id);
        const path = read.outcome === 'resolved' ? manifestPagePath(read.manifest, pagePath) : undefined;
        return read.outcome === 'resolved' && path !== undefined ? { title: read.manifest.title, revision, pagePath: path } : undefined;
      },
      revision: id => previews.revision(id),
      navigation: (boundGuest, changed) => {
        const guest = boundGuest as Electron.WebContents;
        const onNavigation = (_event: Electron.Event, _url: string, _inPlace: boolean, isMainFrame: boolean): void => { if (isMainFrame) changed(); };
        guest.on('did-start-navigation', onNavigation);
        return () => { guest.removeListener('did-start-navigation', onNavigation); };
      },
      capture: (guest, width, height, format) => {
        return captureExportImage(guest as Electron.WebContents, width, height, format);
      },
    }),
    choose: async (name, extension) => {
      const options = { title: t('canvas.export.dialogTitle'), defaultPath: name, filters: [{ name: t(extension === 'jpg' ? 'canvas.export.jpeg' : 'canvas.export.png'), extensions: [extension] }] };
      const parent = dialogParent();
      const chosen = parent === undefined ? await dialog.showSaveDialog(options) : await dialog.showSaveDialog(parent, options);
      return chosen.canceled ? undefined : chosen.filePath;
    },
    write: (path, bytes) => writeAtomicFile(path, Buffer.from(bytes)),
  });
  handle(IPC_INVOKE.canvasExportImage, (_project, request, event) => exportImage(event, request), () => ({ outcome: 'refused', reason: t('canvas.export.unavailable') }));
  installArtifactSessionPolicies(artifactsSession(), artifactStore());

  artifactStore().rebuildIndexOnce();
  const previews = installArtifactPreviews(captureArtifactPreview);
  const search = createArtifactTextSearch(artifactStore());
  onArtifactContentChanged(() => search.invalidate());
  handle(IPC_INVOKE.artifactSearch, createArtifactSearchHandler({renderers, search: async (query, wanted) => {const result = await search.search(query, wanted); if (result.outcome === 'ready') recordArtifactAction('searched', result.matches.length); return result;}}));
  handle(IPC_INVOKE.artifactRename, createArtifactRenameHandler({renderers, store: artifactStore(), changed: (artifactId) => {broadcastToRenderers(IPC_EMIT.artifactChanged, {artifactId}); recordArtifactAction('renamed', 1);}}));
  handle(IPC_INVOKE.artifactPreview, createArtifactPreviewHandler({
    renderers,
    request: (request, wanted) => previews.request(request, wanted),
  }));
  handle(IPC_INVOKE.artifactPreviewHeld, createArtifactPreviewHandler({
    renderers,
    request: async (request, wanted) => {
      const held = await previews.held(request);
      return wanted() ? held : { outcome: 'unavailable' };
    },
  }));
  handle(IPC_INVOKE.artifactList, () => artifactStore().list());
  handle(IPC_INVOKE.artifactPageState, createArtifactPageStateHandler({
    renderers, store: artifactStore(), revision: (artifactId) => previews.revision(artifactId),
  }));
  const pick = createArtifactPickHandler({
    renderers,
    guest: (id) => webContents.fromId(id) ?? undefined,
    session: artifactsSession,
    revision: (artifactId) => previews.revision(artifactId),
    node: async (senderId, nodeId) => {
      const cwd = workspaceOf(senderId);
      if (cwd === undefined) return undefined;
      const node = (await canvasSnapshotFor(cwd)).doc?.nodes[nodeId];
      if (!node || node.kind !== 'artifact') return undefined;
      const read = await artifactStore().read(node.content.artifactId);
      if (read.outcome !== 'resolved') return undefined;
      const pagePath = manifestPagePath(read.manifest, node.content.pagePath);
      if (pagePath === undefined) return undefined;
      return { ...node, artifactUpdatedAt: read.manifest.updatedAt, content: { ...node.content, pagePath } };
    },
  });
  handle(IPC_INVOKE.artifactPick, (_project, request, event) => pick(event, request), () => ({ outcome: 'unavailable' }));
  const text = createArtifactTextHandlers({
    renderers,
    scope: workspaceOf,
    guest: id => webContents.fromId(id) ?? undefined,
    boundGuest: (sender, target, url) => frameBindings.guest(sender, target.docId, target.node, url),
    session: artifactsSession,
    revision: artifactId => previews.revision(artifactId),
    store: artifactStore(),
    projectNames: senderId => {
      const cwd = workspaceOf(senderId);
      const project = cwd === undefined ? undefined : knownProject(cwd);
      return project === undefined || project.internal === 'artifacts' ? [] : [project.sourceRepoName];
    },
    node: async (senderId, nodeId) => {
      const cwd = workspaceOf(senderId);
      if (cwd === undefined) return undefined;
      const snapshot = await canvasSnapshotFor(cwd);
      if (workspaceOf(senderId) !== cwd) return undefined;
      const node = snapshot.doc?.nodes[nodeId];
      if (!snapshot.doc || !node || node.kind !== 'artifact') return undefined;
      const read = await artifactStore().read(node.content.artifactId);
      if (workspaceOf(senderId) !== cwd || read.outcome !== 'resolved') return undefined;
      const pagePath = manifestPagePath(read.manifest, node.content.pagePath);
      return pagePath === undefined ? undefined : {node, docId: snapshot.doc.docId, updatedAt: read.manifest.updatedAt, pagePath};
    },
    changed: artifactId => {
      broadcastToRenderers(IPC_EMIT.artifactChanged, {artifactId});
      capture('artifact_edited', {page_count: 1, first_write: false});
    },
  });
  handle(IPC_INVOKE.artifactTextPrepare, (_project, request, event) => text.prepare(event, request), () => ({ outcome: 'unavailable' }));
  // A token is prepared inside a Project, so a view showing none holds no live one.
  handle(IPC_INVOKE.artifactTextSave, (_project, request, event) => text.save(event, request), () => ({ outcome: 'stale' }));
  handle(IPC_INVOKE.artifactExport, async (sending, request, event) => {
    const wanted = () => artifactRendererAdmitted(event, renderers());
    if (!wanted() || typeof request !== 'object' || request === null || !isArtifactId(request.artifactId) || (request.format !== undefined && !['html', 'pdf', ...IMAGE_EXPORT_FORMATS].includes(request.format))) return { outcome: 'refused' as const, reason: t('artifact.export.unavailable') };
    const format = request.format ?? 'html';
    const revision = previews.revision(request.artifactId);
    const project = knownProject(sending.root);
    const exported = await exportArtifact(artifactStore(), request.artifactId, project === undefined || project.internal === 'artifacts' ? [] : [project.sourceRepoName]);
    if (!exported.ok) {
      capture('artifact_export_result', { outcome: 'refused', count: 1 });
      return { outcome: 'refused' as const, reason: exportRefusalMessage(exported.reason) };
    }
    const opened = await artifactStore().read(request.artifactId);
    if (opened.outcome !== 'resolved' || opened.readOnly) return { outcome: 'refused' as const, reason: t('artifact.export.unavailable') };
    const current = async () => {
      const read = await artifactStore().read(request.artifactId);
      return wanted() && previews.revision(request.artifactId) === revision && read.outcome === 'resolved' && !read.readOnly && read.manifest.updatedAt === opened.manifest.updatedAt;
    };
    const imageFormat = format !== 'html' && format !== 'pdf' ? format : undefined;
    const extension = imageFormat === 'jpeg' ? 'jpg' : imageFormat === undefined ? format : 'png';
    const options = { title: t('artifact.export.dialogTitle'), defaultPath: imageFormat ? imageExportName(exported.title, imageFormat) : `${exported.title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'artifact'}.${format}`, filters: [{ name: t(imageFormat === 'jpeg' ? 'canvas.export.jpeg' : imageFormat ? 'canvas.export.png' : format === 'pdf' ? 'artifact.export.pdfFileType' : 'artifact.export.fileType'), extensions: [extension] }] };
    const parent = dialogParent();
    try {
      const chosen = parent === undefined ? await dialog.showSaveDialog(options) : await dialog.showSaveDialog(parent, options);
      if (chosen.canceled || chosen.filePath === undefined) {
        capture('artifact_export_result', { outcome: 'cancelled', count: 1 });
        return { outcome: 'cancelled' as const };
      }
      if (!await current()) return { outcome: 'refused' as const, reason: t('artifact.export.changed') };
      const output = imageFormat
        ? await artifactRenderQueue.run(wanted, () => withArtifactPageContents({ artifactId: request.artifactId, pagePath: opened.manifest.pages[0]!.path, updatedAt: opened.manifest.updatedAt }, contents => captureExportImage(contents, ARTIFACT_PREVIEW_SIZE.width, ARTIFACT_PREVIEW_SIZE.height, imageFormat), 15_000, imageFormat === 'png-2x' ? 2 : 1))
        : format === 'pdf'
        ? Buffer.from(await joinArtifactPdf(opened.manifest, { current, print: (page) => printArtifactPage(opened.manifest, page, () => wanted() && previews.revision(request.artifactId) === revision) }))
        : exported.html;
      if (!await current()) return { outcome: 'refused' as const, reason: t('artifact.export.changed') };
      try { writeAtomicFile(chosen.filePath, typeof output === 'string' ? output : Buffer.from(output)); }
      catch {
        capture('artifact_export_result', { outcome: 'refused', count: 1 });
        return { outcome: 'refused' as const, reason: t('artifact.export.writeFailed') };
      }
      capture('artifact_export_result', { outcome: 'saved', count: 1 });
      return { outcome: 'saved' as const, name: basename(chosen.filePath), location: chosen.filePath };
    } catch (error) {
      capture('artifact_export_result', { outcome: 'refused', count: 1 });
      return { outcome: 'refused' as const, reason: imageFormat ? imageCaptureFailure(error, t('canvas.export.failed')) : t('artifact.export.writeFailed') };
    }
  }, () => ({ outcome: 'refused', reason: t('artifact.export.unavailable') }));

  handle(
    IPC_INVOKE.artifactCreate,
    async (_event, req: { title?: string }): Promise<ArtifactCreated> => {
      const asked = req.title?.trim() === '' ? undefined : req.title;
      const made = await artifactStore().create({ title: asked, html: starterPage() });
      if (!('code' in made)) broadcastToRenderers(IPC_EMIT.artifactChanged, { artifactId: made.id });
      return 'code' in made ? made : { ok: true as const, artifact: made };
    },
  );

  handle(
    IPC_INVOKE.artifactRead,
    async (_event, req: { artifactId: ArtifactId }): Promise<ArtifactSummary | null> => {
      const read = await artifactStore().read(req.artifactId);
      if (read.outcome !== 'resolved') return null;
      const { manifest } = read;
      return {
        id: manifest.id,
        title: manifest.title,
        pagePath: manifest.pages[0]?.path ?? '',
        pages: manifest.pages,
        ...(manifest.dimensions === undefined ? {} : { dimensions: manifest.dimensions }),
        updatedAt: manifest.updatedAt,
        readOnly: read.readOnly,
        ...(read.blockedDocuments ? {blockedDocuments: read.blockedDocuments} : {}),
      };
    },
  );

  // The confirmation is the renderer's, the way `delete-page` asks: an in-app dialog is the one
  // a designer sees, and it keeps the sentence that names the work out of main (ONL-2568).
  handle(IPC_INVOKE.artifactDelete, createArtifactDeleteHandler({renderers, store: artifactStore(), changed: (artifactId) => {broadcastToRenderers(IPC_EMIT.artifactChanged, {artifactId}); recordArtifactAction('deleted', 1);}}));
}

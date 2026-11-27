import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { workspaceDisplayName, type CanvasDoc, type HeldOrigin, type WorkspaceCreateResult, type WorkspacePlan } from '@studio/events';
import { t } from '@studio/i18n';
import { pathSpellings } from '../lib/canonical-path.js';
import { readCanvasPageCameras, readStoredCurrentPage, writeCanvasCamera, writeCurrentPage, forgetCanvasCamera } from '../canvas/camera.js';
import { cloneCanvasDocument } from '../canvas/duplicate.js';
import { emptyCanvasDoc } from '../canvas/document.js';
import { createFsDocumentStore, deleteCanvasDocFiles, readExistingCanvasDoc } from '../canvas/fs-backend.js';
import { canvasSnapshotFor } from '../canvas/index.js';
import { knownCanvasDocId, rebindCanvasDoc, forgetCanvasDoc } from '../canvas/registry.js';
import { clearWorkspaceImages, settlePending } from '../images/store.js';
import { entryForFolder, serverBookEntries } from '../server/book.js';
import { copyEnvFiles } from './env-files.js';
import { addWorktree, branchExists, captureDiskSnapshot, git, materializeDiskSnapshot, removeWorktree, type DiskSnapshot } from './git.js';
import type { ReadyWorkspacePlan } from './index.js';
import { nextCopyName } from './naming.js';
import { knownProject, projectsOfRepo, setWorkspaceArchived, workspaceHeldOrigin, workspacePathFor, type ProjectRecord } from './store.js';

interface DuplicateCut {
  source: ProjectRecord;
  heldOrigin?: HeldOrigin;
  name: string;
  sourcePort?: number;
  snapshot?: DiskSnapshot;
  doc?: CanvasDoc;
  docId: string;
  cameras: ReturnType<typeof readCanvasPageCameras>;
  currentPageId?: string;
  ownsWorktree: boolean;
  imageIds: string[];
}

const cuts = new Map<string, DuplicateCut>();

export async function planDuplicate(sourcePath: string): Promise<WorkspacePlan> {
  const source = knownProject(sourcePath);
  if (source === undefined || !existsSync(source.workspacePath)) throw new Error(t('projects.copy.error.sourceUnavailable'));
  const occupied = projectsOfRepo(source.repoIdentity).map(workspaceDisplayName);
  for (const cut of cuts.values()) if (cut.source.repoIdentity === source.repoIdentity) occupied.push(cut.name);
  const name = nextCopyName(workspaceDisplayName(source), occupied);
  const workspaceName = `copy-${randomUUID()}`;
  const workspacePath = workspacePathFor(source.repoIdentity, workspaceName, source.sourceRepoRoot);
  const sourceDocId = knownCanvasDocId(source.workspacePath);
  const servers = serverBookEntries(source.workspacePath);
  const server = entryForFolder(source.workspacePath, source.workspacePath) ?? (servers.length === 1 ? servers[0] : undefined);
  const cut: DuplicateCut = {
    source: structuredClone(source), name, docId: randomUUID(), ownsWorktree: false, imageIds: [],
    sourcePort: server?.ports.find((port) => port.measured === 'live')?.port ?? server?.ports[0]?.port,
    heldOrigin: workspaceHeldOrigin(source),
    cameras: sourceDocId === undefined ? {} : readCanvasPageCameras(sourceDocId),
    currentPageId: sourceDocId === undefined ? undefined : readStoredCurrentPage(sourceDocId),
  };
  cuts.set(workspacePath, cut);
  try {
    cut.snapshot = await captureDiskSnapshot(source.workspacePath);
    const live = await canvasSnapshotFor(source.workspacePath);
    cut.doc = structuredClone(live.doc ?? (sourceDocId === undefined ? emptyCanvasDoc(cut.docId) : readExistingCanvasDoc(sourceDocId)));
    const branch = typeof source.branchName === 'string' ? source.branchName : '';
    const slash = branch.indexOf('/');
    const handle = slash > 0 ? branch.slice(0, slash) : 'onlook';
    return {
      kind: 'ready', sourcePath: source.workspacePath, sourceRepoRoot: source.sourceRepoRoot,
      sourceRepoName: source.sourceRepoName, repoIdentity: source.repoIdentity,
      baseBranch: source.baseBranch, baseRef: cut.snapshot.head, baseRefSource: 'local-main',
      workspaceName, branchName: `${handle}/${workspaceName}`, workspacePath,
      origin: 'duplicate', duplicateSourceName: workspaceDisplayName(source),
    };
  } catch (error) {
    cuts.delete(workspacePath);
    throw error;
  }
}

export async function fabricateDuplicate(plan: ReadyWorkspacePlan): Promise<WorkspaceCreateResult> {
  const cut = cuts.get(plan.workspacePath);
  if (cut?.snapshot === undefined || cut.doc === undefined) throw new Error(t('projects.copy.error.snapshotUnavailable'));
  try {
    if (existsSync(plan.workspacePath)) throw new Error(t('projects.copy.error.folderExists'));
    if (await branchExists(cut.source.sourceRepoRoot, plan.branchName)) throw new Error(t('projects.copy.error.branchExists'));
    if (!existsSync(join(cut.source.sourceRepoRoot, '.git'))) throw new Error(t('projects.copy.error.repositoryUnavailable'));
    if (cut.heldOrigin === undefined) await mkdir(dirname(plan.workspacePath), { recursive: true });
    cut.ownsWorktree = true;
    const added = await addWorktree({ root: cut.source.sourceRepoRoot, worktreePath: plan.workspacePath, branch: plan.branchName, startPoint: cut.snapshot.head });
    if (!added.ok) throw new Error(added.err);
    await materializeDiskSnapshot(plan.workspacePath, cut.snapshot);
    const copiedEnvFiles = await copyEnvFiles({ repoRoot: cut.source.workspacePath, workspacePath: plan.workspacePath, untracked: 'all' });
    const { doc, pageIds } = await cloneCanvasDocument(cut.doc, cut.docId, plan.workspacePath, cut.sourcePort);
    cut.imageIds = Object.values(doc.nodes).flatMap((node) => node.kind === 'image' ? [node.content.imageId] : []);
    await createFsDocumentStore().persist(doc);
    for (const [pageId, camera] of Object.entries(cut.cameras)) {
      const destinationPage = pageIds[pageId];
      if (destinationPage !== undefined) writeCanvasCamera(doc.docId, destinationPage, camera);
    }
    const currentPage = cut.currentPageId === undefined ? undefined : pageIds[cut.currentPageId];
    if (currentPage !== undefined) writeCurrentPage(doc.docId, currentPage);
    rebindCanvasDoc(plan.workspacePath, doc.docId);
    const heldOrigin = cut.heldOrigin;
    return {
      ok: true,
      workspace: {
        workspacePath: plan.workspacePath, workspaceName: plan.workspaceName, branchName: plan.branchName,
        baseBranch: cut.source.baseBranch, sourceRepoName: cut.source.sourceRepoName,
        sourcePath: cut.source.sourcePath, sourceRepoRoot: cut.source.sourceRepoRoot,
        repoIdentity: cut.source.repoIdentity, copiedEnvFiles, origin: 'duplicate',
        ...(heldOrigin === undefined ? {} : { heldOrigin }),
        displayName: cut.name, displayNameSource: 'provisional',
        ...(cut.source.comfort === undefined ? {} : { comfort: cut.source.comfort }),
      },
    };
  } catch (error) {
    await rollbackDuplicate(plan);
    return { ok: false, reason: 'create-failed', detail: String(error) };
  }
}

export async function rollbackDuplicate(plan: ReadyWorkspacePlan): Promise<void> {
  const cut = cuts.get(plan.workspacePath);
  if (cut === undefined) return;
  const spellings = pathSpellings(plan.workspacePath);
  if (cut.ownsWorktree) {
    const removed = await removeWorktree(cut.source.sourceRepoRoot, plan.workspacePath);
    if (!removed.ok && existsSync(plan.workspacePath)) throw new Error(removed.err);
    const branch = await git(cut.source.sourceRepoRoot, ['branch', '-D', plan.branchName]);
    if (!branch.ok && existsSync(plan.workspacePath)) throw new Error(branch.err);
  }
  if (cut.ownsWorktree) {
    for (const spelling of spellings) {
      forgetCanvasDoc(spelling);
      clearWorkspaceImages(spelling);
    }
  }
  deleteCanvasDocFiles(cut.docId);
  forgetCanvasCamera(cut.docId);
  cuts.delete(plan.workspacePath);
}

export function completeDuplicateRegistration(workspacePath: string): void {
  const cut = cuts.get(workspacePath);
  if (cut === undefined) return;
  setWorkspaceArchived(cut.source.repoIdentity, false);
  settlePending(workspacePath, cut.imageIds);
  cuts.delete(workspacePath);
}

import { join } from 'node:path';
import { canClearProjectCaptures, clearProjectCaptures, reopenProjectCaptures } from '../agent-host/appserver/capture.js';
import { forgetArchivedChats, readArchivedChats } from '../agent-host/chat-history.js';
import { STORED_HARNESSES } from '../agent-host/harness.js';
import { forgetProjectPreferences, reopenProjectPreferences } from '../agent-host/preferences.js';
import { forgetProjectOpened } from '../agent-host/project-opened.js';
import { forgetProjectSessions, reopenProjectSessions, storedAppServerThread } from '../agent-host/sessions.js';
import { forgetProjectTranscripts, reopenProjectTranscripts } from '../agent-host/transcript.js';
import { transcriptProjectPaths, TRANSCRIPT_FILE_VERSION } from '../agent-host/transcript-storage.js';
import { forgetCanvasCamera } from '../canvas/camera.js';
import { canDeleteCanvasDocFiles, deleteCanvasDocFiles } from '../canvas/fs-backend.js';
import { forgetCanvasDoc, knownCanvasDocId } from '../canvas/registry.js';
import { pathSpellings } from '../lib/canonical-path.js';
import { forgetComposerDraft, reopenComposerDraft } from '../drafts/state.js';
import { forgetGitStatusRow, reopenGitStatusRow } from '../git-status/store.js';
import { clearWorkspaceImages, reopenWorkspaceImages } from '../images/store.js';
import { forgetProjectLocation, reopenProjectLocation } from '../location/state.js';
import { forgetServerBookProject, reopenServerBookProject } from '../server/book.js';
import { forgetSidebarLayout, reopenSidebarLayout } from '../sidebar-layout/state.js';
import { canWriteStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';
import { workspaceRoot } from './store.js';
import { rememberRemovedState } from './removed-state.js';

const STATE_FILES: [string, number][] = [
  ['sessions', 3], ['transcripts', 2], ['chat-history', 1], ['chat-preferences', 2],
  ['composer-drafts', 1], ['canvas-camera', 2], ['location', 2],
];
const WORKSPACE_FILES: [string, number][] = [
  ['workspaces', 4], ['git-status', 1], ['server-book', 1], ['canvas-registry', 1], ['sidebar-layout', 1],
];

function reopenProjectState(cwd: string, spellings: readonly string[]): void {
  reopenProjectCaptures(stateRoot(), cwd, [...spellings]);
  for (const spelling of spellings) {
    reopenServerBookProject(spelling);
    reopenSidebarLayout(spelling);
    reopenComposerDraft(spelling);
    reopenProjectPreferences(spelling);
    reopenGitStatusRow(spelling);
    reopenProjectTranscripts(spelling);
    reopenProjectSessions(spelling);
    reopenWorkspaceImages(spelling);
    reopenProjectLocation(spelling);
  }
}

function captureThreadIds(cwd: string): string[] {
  const current = storedAppServerThread(cwd);
  const archived = readArchivedChats(cwd, 'appserver').map((chat) => chat.sessionId);
  return current === undefined ? archived : [current, ...archived];
}

export function canForgetProjectState(cwd: string, spellings = pathSpellings(cwd)): boolean {
  try {
    if (!STATE_FILES.every(([name, version]) => canWriteStateFile(join(stateRoot(), `${name}.json`), version)) ||
      !WORKSPACE_FILES.every(([name, version]) => canWriteStateFile(join(workspaceRoot(), `${name}.json`), version))) return false;
    const docId = knownCanvasDocId(cwd);
    return (docId === undefined || canDeleteCanvasDocFiles(docId)) && spellings.every((spelling) =>
      transcriptProjectPaths(stateRoot(), spelling).every(path => canWriteStateFile(path, TRANSCRIPT_FILE_VERSION)) &&
      canClearProjectCaptures(stateRoot(), spelling, captureThreadIds(spelling)));
  } catch {
    return false;
  }
}

export function forgetProjectState(cwd: string, spellings = pathSpellings(cwd)): void {
  if (!canForgetProjectState(cwd, spellings)) throw new Error('Project state belongs to a newer Onlook build or cannot be read');
  rememberRemovedState(spellings, () => reopenProjectState(cwd, spellings));
  const docId = knownCanvasDocId(cwd);
  forgetProjectLocation(cwd, spellings);
  for (const spelling of spellings) {
    clearProjectCaptures(stateRoot(), spelling, captureThreadIds(spelling));
    forgetServerBookProject(spelling);
    forgetSidebarLayout(spelling);
    forgetProjectOpened(spelling);
    forgetComposerDraft(spelling);
    forgetProjectPreferences(spelling);
    forgetGitStatusRow(spelling);
    forgetProjectTranscripts(spelling);
    forgetProjectSessions(spelling);
    for (const harness of STORED_HARNESSES) {
      forgetArchivedChats(spelling, harness);
    }
    clearWorkspaceImages(spelling, { strict: true });
    forgetCanvasDoc(spelling);
  }
  if (docId !== undefined) {
    if (!deleteCanvasDocFiles(docId)) throw new Error('Canvas belongs to a newer Onlook build');
    forgetCanvasCamera(docId);
  }
}

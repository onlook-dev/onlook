// A registry, not imports: the gate reaches the mounted component's own action, never a second implementation; registration is a no-op while the gate is closed (ONL-2372).

import type {
  DebugArtifactRead,
  DebugScreenKind,
  ProjectImportEntryPoint,
  ProjectImportOutcome,
  ProjectSummary,
} from '@studio/events';

const ARTIFACT_READS_MAX = 200;

export interface RootActions {
  kind: DebugScreenKind;
  createBlank: () => void;
}

export interface ProjectsActions {
  open: (project: ProjectSummary) => Promise<void>;
  reveal: (project: ProjectSummary) => void;
  remove: (project: ProjectSummary) => void;
  removeWorkspace: (repoIdentity: string) => void;
  selectWorkspace: (repoIdentity: string) => void;
  selectedWorkspace: string | null;
  /** The discovered row's own import, and the picker's continuation; undefined is a bridge refusal (ONL-2522). */
  importWorktree: (
    handle: string,
    entryPoint: ProjectImportEntryPoint,
  ) => Promise<ProjectImportOutcome | undefined>;
}

export interface FramePickerActions {
  isArmed: boolean;
  pick: (selector: string, shiftHeld: boolean) => void;
}

export interface HoveredElement {
  frameId: string;
  tag: string | null;
  domPath: string | null;
}

export interface HoverCounters {
  hoverSends: number;
  hitTests: number;
  hovered: HoveredElement | null;
}

let isOpen = false;
let root: RootActions | null = null;
let projects: ProjectsActions | null = null;
const pickers = new Map<string, FramePickerActions>();
let hoverSends = 0;
let hitTests = 0;
let hovered: HoveredElement | null = null;
const artifactReads: DebugArtifactRead[] = [];
const lastArtifactRead = new Map<string, DebugArtifactRead['state']>();
let artifactReadSeq = 0;

export function openDiagnosticsRegistry(): void {
  isOpen = true;
}

export function isDiagnosticsOpen(): boolean {
  return isOpen;
}

export function noteHoverSend(): void {
  if (isOpen) hoverSends += 1;
}

export function noteGuestHover(report: HoveredElement & { hitTests: number }): void {
  if (!isOpen) return;
  hitTests = report.hitTests;
  hovered = { frameId: report.frameId, tag: report.tag, domPath: report.domPath };
}

export function hoverCounters(): HoverCounters {
  return { hoverSends, hitTests, hovered };
}

export function noteArtifactRead(read: Omit<DebugArtifactRead, 'seq'>): void {
  if (!isOpen) return;
  // A re-render is not a transition; the node's own last state decides, never the tail of the list.
  if (lastArtifactRead.get(read.nodeId) === read.state) return;
  lastArtifactRead.set(read.nodeId, read.state);
  artifactReads.push({ ...read, seq: artifactReadSeq });
  artifactReadSeq += 1;
  if (artifactReads.length > ARTIFACT_READS_MAX) artifactReads.shift();
}

export function artifactReadsSeen(): readonly DebugArtifactRead[] {
  return [...artifactReads];
}

function noop(): void {
}

export function registerRootActions(actions: RootActions): () => void {
  if (!isOpen) return noop;
  root = actions;
  return () => {
    if (root === actions) root = null;
  };
}

export function rootActions(): RootActions | null {
  return root;
}

export function registerProjectsActions(actions: ProjectsActions): () => void {
  if (!isOpen) return noop;
  projects = actions;
  return () => {
    if (projects === actions) projects = null;
  };
}

export function projectsActions(): ProjectsActions | null {
  return projects;
}

export function registerFramePicker(frameId: string, actions: FramePickerActions): () => void {
  if (!isOpen) return noop;
  pickers.set(frameId, actions);
  return () => {
    if (pickers.get(frameId) === actions) pickers.delete(frameId);
  };
}

export function framePicker(frameId: string): FramePickerActions | null {
  return pickers.get(frameId) ?? null;
}

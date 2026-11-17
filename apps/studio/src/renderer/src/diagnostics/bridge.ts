// Reached only through main's `#debug` hash; every method forwards to the action a control already calls and implements nothing of its own (ONL-2372).

import {
  COMFORT_CHOICES,
  DEBUG_SELECTOR_MAX,
  debugCanvasStateEveryPage,
  type ComfortChoice,
  type DebugActionResult,
  type DebugInlineChatState,
  type DebugSelectRequest,
  type DebugSelectionState,
  type DebugStores,
  type DebugScreenKind,
  type DebugScreenState,
  type ProjectImportEntryPoint,
  type ProjectSummary,
  type StudioDebugBridge,
} from '@studio/events';
import { isPickerLive } from '../canvas/frame/geometry.js';
import { frameFlowNodes } from '../canvas/model.js';
import { currentCanvasPageId } from '../canvas/compose.js';
import { openInlineAttachments } from '../canvas/inlineAttachments.js';
import { useCanvasStore } from '../canvas/store.js';
import { submitInlineChat } from '../canvas/useInlineElementChat.js';
import { useProjectsStore } from '../projects/store.js';
import { sessionCovered, useWorkspaceStore } from '../workspace/store.js';
import {
  artifactReadsSeen,
  framePicker,
  hoverCounters,
  openDiagnosticsRegistry,
  projectsActions,
  rootActions,
  type ProjectsActions,
} from './registry.js';
import { studio } from '../bridge.js';

declare global {
  interface Window {
    __ONLOOK_DEBUG__?: StudioDebugBridge;
  }
}

const OK: DebugActionResult = { ok: true };

function refuse(reason: string): DebugActionResult {
  return { ok: false, reason };
}

function onListedWorkspace(
  repoIdentity: string,
  act: (grid: ProjectsActions) => void,
): DebugActionResult {
  const grid = projectsActions();
  if (!grid) return refuse('the tab is not on the projects screen');
  const listed = useProjectsStore
    .getState()
    .workspaces.some((held) => held.repoIdentity === repoIdentity);
  if (!listed) return refuse(`no workspace ${repoIdentity} is in this tab's sidebar`);
  act(grid);
  return OK;
}

function findProject(workspacePath: string): ProjectSummary | undefined {
  for (const workspace of useProjectsStore.getState().workspaces) {
    const project = workspace.projects.find((held) => held.workspacePath === workspacePath);
    if (project) return project;
  }
  return undefined;
}

/** Scalars, never the draft's text: the length is what a walk needs to know its keystrokes landed (ONL-2455). */
function inlineChat(): DebugInlineChatState | null {
  const record = useCanvasStore.getState().inlineChat;
  if (record === null) return null;
  return {
    anchorId: record.anchorId,
    draftChars: record.draft.length,
    placement: record.placement,
    send: record.send,
    refusal: record.refusal,
  };
}

function screenKind(): DebugScreenKind {
  return rootActions()?.kind ?? 'pending';
}

function screen(): DebugScreenState {
  const canvas = useCanvasStore.getState();
  const hover = hoverCounters();
  return {
    kind: screenKind(),
    workspacePath: canvas.project?.path ?? null,
    selectedWorkspace: projectsActions()?.selectedWorkspace ?? null,
    isPicking: canvas.isPicking,
    frames: frameFlowNodes(canvas.nodes).map((node) => ({
      id: node.id,
      name: node.data.name,
      homeUrl: node.data.homeUrl,
      isArmed: framePicker(node.id)?.isArmed ?? false,
    })),
    mode: canvas.mode,
    tool: canvas.tool,
    hoverSends: hover.hoverSends,
    hitTests: hover.hitTests,
    hovered: hover.hovered,
    inlineChat: inlineChat(),
  };
}

function stores(): DebugStores {
  const canvas = useCanvasStore.getState();
  const workspace = useWorkspaceStore.getState();
  return {
    projects: useProjectsStore.getState().workspaces,
    location: {
      screen: screenKind(),
      workspacePath: workspace.workspace?.workspacePath ?? null,
      repoIdentity: workspace.workspace?.repoIdentity ?? null,
      canvasProjectPath: canvas.project?.path ?? null,
      isSwitching: sessionCovered(workspace),
    },
    canvas: {
      doc: debugCanvasStateEveryPage(canvas.doc),
      currentPageId: currentCanvasPageId(canvas),
      selectedNodeIds: canvas.selectedNodeIds,
      hoveredNodeId: canvas.hoveredNodeId,
      artifactReads: artifactReadsSeen(),
    },
  };
}

function selections(): DebugSelectionState[] {
  return useCanvasStore.getState().elementSelections.map((selection) => ({
    id: selection.evidence.id,
    frameId: selection.frameNodeId,
    tag: selection.evidence.tag,
    domPath: selection.evidence.domPath,
    stale: selection.stale,
  }));
}

export const debugBridge: StudioDebugBridge = {
  screen,
  stores,
  selections,

  createBlank: (): DebugActionResult => {
    const root = rootActions();
    if (!root) return refuse('the renderer has not mounted a screen yet');
    if (root.kind !== 'projects') return refuse(`the tab is on the ${root.kind} screen, not projects`);
    root.createBlank();
    return OK;
  },

  importProject: async (sourcePath: string, comfort?: ComfortChoice): Promise<DebugActionResult> => {
    if (comfort !== undefined && !COMFORT_CHOICES.includes(comfort)) return refuse(`the comfort answer is one of ${COMFORT_CHOICES.join(', ')}`);
    const plan = await studio().workspacePlan({ sourcePath });
    if (plan.kind === 'refused') return refuse(plan.detail ?? plan.reason);
    studio().tabsCreateProject({ sourcePath: plan.sourcePath, ...(comfort === undefined ? {} : { comfort }), entryPoint: 'projects' });
    return OK;
  },

  openProject: async (workspacePath: string): Promise<DebugActionResult> => {
    const grid = projectsActions();
    if (!grid) return refuse('the tab is not on the projects screen');
    const project = findProject(workspacePath);
    if (!project) return refuse(`no project at ${workspacePath} is in this tab's list`);
    // The card refuses the same one: a missing project's tile does not open.
    if (project.missing) return refuse(`the project at ${workspacePath} is missing from disk`);
    await grid.open(project);
    return OK;
  },

  importWorktree: async (
    handle: string,
    entryPoint: ProjectImportEntryPoint = 'discovered',
  ): Promise<DebugActionResult> => {
    const grid = projectsActions();
    if (!grid) return refuse('the tab is not on the projects screen');
    const outcome = await grid.importWorktree(handle, entryPoint);
    // The dialog the row shows, as a refusal: ok here means registered (ONL-2522).
    if (outcome === undefined) return refuse('the import did not reach main');
    if (!outcome.ok) return refuse(outcome.reason);
    return OK;
  },

  revealProject: (workspacePath: string): DebugActionResult => {
    const grid = projectsActions();
    if (!grid) return refuse('the tab is not on the projects screen');
    const project = findProject(workspacePath);
    if (!project) return refuse(`no project at ${workspacePath} is in this tab's list`);
    // The card refuses the same one: the item is disabled when the folder is gone.
    if (project.missing) return refuse(`the project at ${workspacePath} is missing from disk`);
    grid.reveal(project);
    return OK;
  },

  removeProject: (workspacePath: string): DebugActionResult => {
    const grid = projectsActions();
    if (!grid) return refuse('the tab is not on the projects screen');
    const project = findProject(workspacePath);
    if (!project) return refuse(`no project at ${workspacePath} is in this tab's list`);
    grid.remove(project);
    return OK;
  },

  removeWorkspace: (repoIdentity: string): DebugActionResult =>
    onListedWorkspace(repoIdentity, (grid) => {
      grid.removeWorkspace(repoIdentity);
    }),

  selectWorkspace: (repoIdentity: string): DebugActionResult =>
    onListedWorkspace(repoIdentity, (grid) => {
      grid.selectWorkspace(repoIdentity);
    }),

  addFrame: (homeUrl: string): DebugActionResult => {
    const canvas = useCanvasStore.getState();
    if (!canvas.doc) return refuse('no canvas document is open in this tab');
    canvas.addFrame(homeUrl);
    return OK;
  },

  removeFrame: (frameId: string): DebugActionResult => {
    const canvas = useCanvasStore.getState();
    if (!canvas.doc?.nodes[frameId]) return refuse(`no frame ${frameId} is on this canvas`);
    canvas.removeFrame(frameId);
    return OK;
  },

  renameFrame: (frameId: string, name: string): DebugActionResult => {
    const canvas = useCanvasStore.getState();
    if (!canvas.doc?.nodes[frameId]) return refuse(`no frame ${frameId} is on this canvas`);
    canvas.renameFrame(frameId, name);
    return OK;
  },

  setPicking: (isPicking: boolean): DebugActionResult => {
    const canvas = useCanvasStore.getState();
    if (!canvas.doc) return refuse('no canvas document is open in this tab');
    canvas.setPicking(isPicking);
    return OK;
  },

  selectElement: (request: DebugSelectRequest): DebugActionResult => {
    if (request.selector.length > DEBUG_SELECTOR_MAX) return refuse('the selector is too long');
    // The live condition, not an armed one: Design mode picks with nothing armed (ONL-2455).
    const canvas = useCanvasStore.getState();
    if (!isPickerLive(canvas)) {
      return refuse(
        canvas.mode !== 'design'
          ? `the canvas is in ${canvas.mode} mode, where no element is pickable`
          : `the ${canvas.tool} tool holds the pointer, so no picker is live`,
      );
    }
    const picker = framePicker(request.frameId);
    if (!picker) return refuse(`no frame ${request.frameId} is mounted in this tab`);
    // Live host-side is not live in the guest: a pick sent before the arm lands is dropped there.
    if (!picker.isArmed) return refuse(`frame ${request.frameId} has not been told the picker is live yet`);
    picker.pick(request.selector, request.add ?? false);
    return OK;
  },

  submitInline: async (): Promise<DebugActionResult> => {
    const canvas = useCanvasStore.getState();
    const record = canvas.inlineChat;
    if (record === null) return refuse('no inline bubble is open on this canvas');
    if (record.draft.trim().length === 0 && openInlineAttachments(canvas).drafts.length === 0) {
      return refuse('the bubble carries nothing to send');
    }
    const verdict = await submitInlineChat(record.draft);
    if (verdict === 'refused') return refuse('the session turned the send away');
    if (verdict === 'unchanged') return refuse('the send reached no session');
    return OK;
  },
};

export function installDebugBridge(): void {
  openDiagnosticsRegistry();
  window.__ONLOOK_DEBUG__ = debugBridge;
}

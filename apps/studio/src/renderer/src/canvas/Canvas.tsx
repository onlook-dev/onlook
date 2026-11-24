import { useMemo } from 'react';
import { useFrameZoomStyle } from './frame/useFrameZoomStyle.js';
import { beginCameraMotion, endCameraMotion, noteCameraMotion, useCameraMotionLifetime } from './cameraMotion.js';
import { useCaptureReveal } from './useCaptureReveal.js';
import { SectionNode } from './SectionNode.jsx';
import { CanvasPaneMenu } from './menu/CanvasPaneMenu.jsx';
import { useFlag } from '../flags/store.js';
import { useSurface } from '../activation/useSurface.js';
import { canvasSurface } from '../activation/canvasSurface.js';
import {
  ReactFlow,
  useReactFlow,
  useStore as useFlowStore,
  ViewportPortal,
  type NodeTypes,
  SelectionMode,
} from '@xyflow/react';
import { Center } from '@astryxdesign/core/Center';
import { Icon } from '@astryxdesign/core/Icon';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Stack } from '@astryxdesign/core/Layout';
import { canSubmitPrompt, useAgentStore } from '../agent/store.js';
import { runControlPhase, usePaintedCreateState, useProjectCreateStore } from '../create/projectCreate.js';
import { useImportSetupProgress, useSetupTurnStore } from '../create/setupProgress.js';
import { setupHidesRunControl, useInspireTipShown } from '../sidebar/footSeat.js';
import { t } from '@studio/i18n';
import {
  deriveRunControl,
  hasLiveEntry,
  useServerStore,
} from '../server/store.js';
import { useCameraControls, useCameraFollowsLeftPanel } from './camera.js';
import { usePanelCover, type PanelCover } from './panelCover.js';
import { CanvasToolbar } from './CanvasToolbar.jsx';
import { selectProjectSetupSnapshot, useProjectSetupStore } from '../project-setup/store.js';
import { reportProjectRunIntent } from '../project-setup/runControl.js';
import { CANVAS_CLIPBOARD_TYPE, classifyPaste } from './clipboard/clipboard.js';
import { ARTIFACT_PLACEMENT_TYPE, dropLibraryArtifact } from './artifact/libraryPlacement.js';
import { EmptyCanvasSlot } from './EmptyCanvasIllustration.jsx';
import { sendIdea } from './ideas/send.js';
import { SetupFailureCardSlot } from './SetupFailureCard.jsx';
import { canvasCentre } from './failureCentre.js';
import { useEmptyCanvasState } from './useEmptyCanvasState.js';
import { PlaygroundGlyph } from '../icons/glyphs.js';
import { OffscreenSelectionMarks } from './OffscreenSelectionMarks.jsx';
import { RecenterButton } from './RecenterButton.jsx';
import { FrameNode } from './frame/FrameNode.jsx';
import { frameRingScale } from './frame/geometry.js';
import { installFrameDrawWindowSeat } from './frameDrawWindowSeat.js';
import {
  installDuplicateDragWindowSeat,
  useWindowEventSeat,
} from './gestureWindowSeats.js';
import {
  ARTIFACT_NODE_TYPE,
  SECTION_NODE_TYPE,
  FRAME_NODE_TYPE,
  frameFlowNodes,
  framePointedUrls,
  IMAGE_NODE_TYPE,
  isArtifactFlowNode,
  TEXT_NODE_TYPE,
  ZOOM_BOUNDS,
} from './model.js';
import { ArtifactNode } from './artifact/ArtifactNode.jsx';
import { DeleteArtifactDialog } from './artifact/DeleteArtifactDialog.jsx';
import { ImageNode } from './image/ImageNode.jsx';
import { CanvasRefusalBand, ImageRefusalBand } from './image/RefusalBand.jsx';
import { useCanvasFileDrop } from './image/dropSeat.js';
import { useCanvasClipboard } from './clipboard/seat.js';
import { TextDraftNode, TextNode } from './text/TextNode.jsx';
import { TextSizeBar } from './text/SizeBar.jsx';
import { isTextPlacementClick } from './text/placement.js';
import { windowViewRect } from './placement.js';
import { artifactAccentAttrs } from './artifactAccent.js';
import { isDrawnTool } from './frameDraw.js';
import { ARTIFACT_ACCENT_ATTRS } from './artifactAccent.js';
import { notePanEnd, notePanMove, notePanStart } from '../perf/index.js';
import { framesVisible, panKindOf } from '../perf/pan.js';
import { dispatchCanvasRedo, dispatchCanvasUndo } from './historyDispatch.js';
import { dimensionBadgeNodeId, useCanvasStore, isChromeHidden } from './store.js';
import { isBlankWorkspace, useWorkspaceStore } from '../workspace/store.js';
import { startControlShown } from './toolbarRunControl.js';
import { useAppBeenUp } from './useAppBeenUp.js';
import { useSpacePanHold } from './useSpacePanHold.js';
import { useScrollKeyHold } from './frame/scrollKey.js';
import { useZoomModifier } from './useZoomModifier.js';
import { useNodeNudge } from './useNodeNudge.js';
import { NodeMeasure } from './NodeMeasure.jsx';
import {
  useCanvasDocumentConnection,
  useServerStateConnection,
  useProjectSetupConnection,
  useSetupLandingConnection,
} from './useCanvasConnections.js';
import { useCanvasCameraSync } from './useCanvasCameraSync.js';
import { useSelectionGesture } from './useSelectionGesture.js';
import { useCanvasServerBook } from './useCanvasServerBook.js';
import { escapeInlineChat, useInlineElementChat } from './useInlineElementChat.js';
import type { InlineChatEntry } from './inlinePlacement.js';
import { useEscape, useShortcut } from '../shortcuts/index.js';
import { useSelectionMappingRequest } from '../code/selectionMapping.js';
import { PICKER_INK } from '@studio/events';
import { useInspireCanvasSource } from './inspire/useInspireCanvasSource.js';
import { studio } from '../bridge.js';
import { LAYER } from '../overlay/layers.js';

const nodeTypes: NodeTypes = {
  [SECTION_NODE_TYPE]: SectionNode,
  [FRAME_NODE_TYPE]: FrameNode,
  [TEXT_NODE_TYPE]: TextNode,
  [IMAGE_NODE_TYPE]: ImageNode,
  [ARTIFACT_NODE_TYPE]: ArtifactNode,
};

function canvasSpan(cover: PanelCover): React.CSSProperties {
  return {
    position: 'absolute',
    insetBlock: 0,
    insetInlineStart: cover.start,
    insetInlineEnd: cover.end,
  };
}

/** Mounted always and only styled on: an element that appears with its transition has nothing to fade from. */
const REGION_DROP = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  transition: 'background-color 120ms ease, box-shadow 120ms ease',
} as const;

/** The composer's own `COMPOSER_DROP_LIT`, so one treatment covers both drop targets. */
const REGION_DROP_LIT = {
  boxShadow: 'inset 0 0 0 0.5px var(--color-accent)',
  backgroundColor: 'var(--color-accent-muted)',
} as const;

function ImageDropOutline(): React.JSX.Element {
  const isTargeted = useCanvasStore((state) => state.fileDrag?.isOverCanvas === true);
  return (
    <div
      data-testid="canvas-image-drop-outline"
      data-dropping={isTargeted ? 'true' : 'false'}
      style={{ ...REGION_DROP, ...(isTargeted ? REGION_DROP_LIT : {}) }}
    />
  );
}

function DuplicateDragPreviews(): React.JSX.Element | null {
  const drag = useCanvasStore((state) => state.duplicateDrag);
  const doc = useCanvasStore((state) => state.doc);
  const gesture = useCanvasStore((state) => state.gesture);
  const { getViewport } = useReactFlow();
  if (!drag || drag.isCancelled || !doc) return null;

  const previewNodes: Array<{
    id: string;
    position: { x: number; y: number };
    width: number;
    height: number;
  }> = [];
  for (const id of drag.ids) {
    const source = doc.nodes[id];
    const held = gesture[id];
    if (!source || held?.x === undefined || held.y === undefined) continue;
    if (held.x === source.x && held.y === source.y) continue;
    previewNodes.push({
      id,
      position: { x: held.x, y: held.y },
      width: held.width ?? source.width,
      height: held.height ?? source.height,
    });
  }
  if (previewNodes.length === 0) return null;
  const thickness = frameRingScale(getViewport().zoom);

  return (
    <ViewportPortal>
      {previewNodes.map((node) => (
        <div
          key={node.id}
          data-testid="canvas-duplicate-preview"
          style={{
            position: 'absolute',
            left: node.position.x,
            top: node.position.y,
            width: node.width ?? 0,
            height: node.height ?? 0,
            boxSizing: 'border-box',
            background: 'var(--color-background-card)',
            outline: `${String(thickness)}px solid var(--color-accent)`,
            opacity: 0.58,
            pointerEvents: 'none',
            zIndex: LAYER.floating,
          }}
        />
      ))}
    </ViewportPortal>
  );
}

/** Zoom read lazily, not subscribed: guides exist only mid-drag, when the camera is parked and every tick re-renders this (ONL-2044). */
function SnapGuides(): React.JSX.Element | null {
  const guides = useCanvasStore((state) => state.snapGuides);
  const { getViewport } = useReactFlow();
  if (guides.length === 0) return null;
  const thickness = frameRingScale(getViewport().zoom);
  return (
    <ViewportPortal>
      {guides.map((guide) => (
        <div
          key={`${guide.orientation}-${String(guide.position)}`}
          data-testid="canvas-snap-guide"
          style={{
            position: 'absolute',
            zIndex: LAYER.canvasOverlay,
            // The picker's red, not the accent: a guide reads as a measurement, apart from the frame's own ring.
            backgroundColor: PICKER_INK,
            pointerEvents: 'none',
            ...(guide.orientation === 'vertical'
              ? {
                  left: guide.position - thickness / 2,
                  top: guide.from,
                  width: thickness,
                  height: guide.to - guide.from,
                }
              : {
                  left: guide.from,
                  top: guide.position - thickness / 2,
                  width: guide.to - guide.from,
                  height: thickness,
                }),
          }}
        />
      ))}
    </ViewportPortal>
  );
}

/** Canvas units, not screen px; numeric content only, so no `strings.ts` key. */
function DimensionBadge({
  testid,
  box,
  scale,
  isArtifact = false,
}: {
  testid: string;
  box: { x: number; y: number; width: number; height: number };
  scale: number;
  /** Carries the accent scope itself: the badge renders in a ViewportPortal, outside the node's subtree. */
  isArtifact?: boolean;
}): React.JSX.Element {
  return (
    <div
      data-testid={testid}
      {...artifactAccentAttrs(isArtifact)}
      style={{
        zIndex: LAYER.canvasOverlay,
        position: 'absolute',
        left: box.x + box.width / 2,
        top: box.y + box.height + 5 * scale,
        transform: `translateX(-50%) scale(${String(scale)})`,
        transformOrigin: 'top center',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: BADGE_SECTION_GAP,
        fontSize: 'var(--font-size-xs)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {isArtifact ? (
        <Tooltip content={t('frame.kind.htmlArtifact')} placement="below">
        <div
          data-testid="frame-dimension-kind"
          style={{
            /* The only hoverable part: the parent stays pointer-events none so the readout never eats a canvas drag. */
            pointerEvents: 'auto',
            ...BADGE_SECTION,
            width: BADGE_SECTION_SIZE,
            height: BADGE_SECTION_SIZE,
            padding: 0,
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon
            icon={PlaygroundGlyph}
            color="inherit"
            /* Inline: the icon ramp has no 12px step for 11px type. */
            style={{ width: BADGE_GLYPH_BOX, height: BADGE_GLYPH_BOX, flexShrink: 0 }}
          />
        </div>
        </Tooltip>
      ) : null}
      <div style={{ ...BADGE_SECTION, padding: `${String(BADGE_SECTION_PAD_BLOCK)}px 6px` }}>
        {`${String(Math.round(box.width))} × ${String(Math.round(box.height))}`}
      </div>
    </div>
  );
}

const BADGE_GLYPH_BOX = 12;
const BADGE_SECTION_GAP = 4;
const BADGE_SECTION_PAD_BLOCK = 3;
const BADGE_SECTION_SIZE = `calc(1em + ${String(BADGE_SECTION_PAD_BLOCK * 2)}px)`;
const BADGE_SECTION = {
  backgroundColor: 'var(--color-accent)',
  color: 'var(--color-background-card)',
  borderRadius: 'var(--radius-element)',
  cornerShape: 'superellipse(1.5)',
  alignItems: 'center',
} as const;

function ResizeReadout(): React.JSX.Element | null {
  const readout = useCanvasStore((state) => state.resizeReadout);
  /* By id: the readout carries the live box, not the node; a null id is a tool's draw, an artifact's when that tool is armed (ONL-2593). */
  const isArtifact = useCanvasStore((state) =>
    readout?.id == null
      ? state.tool === 'artifact'
      : state.nodes.some((node) => node.id === readout.id && isArtifactFlowNode(node)),
  );
  const { getViewport } = useReactFlow();
  if (!readout) return null;
  return (
    <ViewportPortal>
      <DimensionBadge
        testid="frame-resize-readout"
        box={readout}
        scale={frameRingScale(getViewport().zoom)}
        isArtifact={isArtifact}
      />
    </ViewportPortal>
  );
}

/** Subscribed to zoom alone, not `useViewport`, which re-renders on every pan tick; a resting badge still counter-scales on zoom. */
function SelectionDimensionBadge(): React.JSX.Element | null {
  const nodes = useCanvasStore((state) => state.nodes);
  const badgeId = useCanvasStore(dimensionBadgeNodeId);
  const zoom = useFlowStore((state) => state.transform[2]);
  const node = nodes.find((candidate) => candidate.id === badgeId);
  if (node === undefined) return null;
  return (
    <ViewportPortal>
      <DimensionBadge
        testid="frame-dimension-badge"
        box={{
          x: node.position.x,
          y: node.position.y,
          width: node.width ?? 0,
          height: node.height ?? 0,
        }}
        scale={frameRingScale(zoom)}
        isArtifact={isArtifactFlowNode(node)}
      />
    </ViewportPortal>
  );
}

/** From the readout, not re-derived from the draw, so the rect and its badge agree. */
function FrameDrawPreview(): React.JSX.Element | null {
  const readout = useCanvasStore((state) => state.resizeReadout);
  // Drawing an artifact previews in the artifact blue, as the node it becomes (ONL-2593).
  const isArtifact = useCanvasStore((state) => state.tool === 'artifact');
  const { getViewport } = useReactFlow();
  if (!readout || readout.id !== null) return null;
  const thickness = frameRingScale(getViewport().zoom);
  return (
    <ViewportPortal>
      <div
        data-testid="canvas-frame-draw-preview"
        {...(isArtifact ? ARTIFACT_ACCENT_ATTRS : {})}
        style={{
          position: 'absolute',
          zIndex: LAYER.canvasOverlay,
          left: readout.x,
          top: readout.y,
          width: readout.width,
          height: readout.height,
          border: `${String(thickness)}px solid var(--color-accent)`,
          pointerEvents: 'none',
        }}
      />
    </ViewportPortal>
  );
}

/** Both gesture props share it: a click distance above the drag threshold lets one press move the frame and fire a pick (ONL-2455). */
const GESTURE_TOLERANCE = 3;

export function Canvas({
  inlineChatEntry = 'input',
}: {
  /** `input` is the default; `orb` is undecided (ONL-2455). */
  inlineChatEntry?: InlineChatEntry;
} = {}): React.JSX.Element {
  useSelectionMappingRequest();
  // In the store, not `useNodesState`: a guest's load and a user's drag would race two copies.
  const nodes = useCanvasStore((state) => state.nodes);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const hoverNode = useCanvasStore((state) => state.hoverNode);
  const tool = useCanvasStore((state) => state.tool);
  const artifactDeleteAsk = useCanvasStore((state) => state.artifactDeleteAsk);
  const endDeleteArtifactAsk = useCanvasStore((state) => state.endDeleteArtifactAsk);
  const deleteArtifact = useCanvasStore((state) => state.deleteArtifact);
  const mode = useCanvasStore((state) => state.mode);
  const leftPanelView = useCanvasStore((state) => state.leftPanelView);
  const selectionGesture = useSelectionGesture(tool, mode);
  const chromeHidden = useCanvasStore(isChromeHidden);
  const setTool = useCanvasStore((state) => state.setTool);
  const followServerPort = useCanvasStore((state) => state.followServerPort);
  const { getViewport, screenToFlowPosition, setCenter, setViewport, zoomIn, zoomOut, zoomTo } =
    useReactFlow();
  useFrameZoomStyle();
  const frameDrawSeat = useWindowEventSeat(() => useCanvasStore.getState().cancelFrameDraw());
  const duplicateDragSeat = useWindowEventSeat(() => {
    useCanvasStore.getState().cancelDuplicateDrag();
    useCanvasStore.getState().endDuplicateDrag();
  });
  const textPlaceSeat = useWindowEventSeat();
  const camera = useCameraControls();
  useCameraFollowsLeftPanel();
  useInspireCanvasSource();
  const cover = usePanelCover();
  const flyTo = useCanvasStore((state) => state.flyTo);
  const fitRequest = useCanvasStore((state) => state.fitRequest);
  const viewportRequest = useCanvasStore((state) => state.viewportRequest);
  const restoredViewport = useCanvasStore((state) => state.restoredViewport);
  useSpacePanHold();
  useScrollKeyHold();
  const isZoomHeld = useZoomModifier();
  useNodeNudge();
  useServerStateConnection();
  useProjectSetupConnection();
  useSetupLandingConnection();
  useCanvasDocumentConnection();
  useCanvasCameraSync({
    nodes,
    flyTo,
    cover,
    fitRequest,
    viewportRequest,
    getViewport,
    setCenter,
    setViewport,
    zoomIn,
    zoomOut,
    zoomTo,
    camera,
  });
  useCaptureReveal({ getViewport, setViewport });
  useCanvasServerBook(followServerPort);
  const { openImagePicker, ingestImages } = useCanvasFileDrop(screenToFlowPosition);
  const pasteFromMenu = useCanvasClipboard({ screenToFlowPosition, ingestImages });
  const onPaneClick = useInlineElementChat({ entry: inlineChatEntry });
  const isSpacePanning = useCanvasStore((state) => state.isSpacePanning);

  const serverEntries = useServerStore((state) => state.entries);
  const serverPending = useServerStore((state) => state.pending);
  const serverStopPressed = useServerStore((state) => state.stopPressed);
  const projectSetup = useProjectSetupStore(selectProjectSetupSnapshot);
  const hasSavedSetup = projectSetup?.saved != null;
  const frameUrls = useMemo(() => framePointedUrls(nodes), [nodes]);
  /** `hasStarter` bypasses `canRun`: a press on Studio's own starter is main's to act on and needs no session (ONL-2152). */
  const { runState: measuredRunState, hasStarter } = useMemo(
    () => deriveRunControl(serverEntries, serverPending,
      hasSavedSetup ? serverEntries.flatMap((entry) => entry.ports.map((port) => port.origin)) : frameUrls,
      serverStopPressed),
    [serverEntries, serverPending, frameUrls, serverStopPressed, hasSavedSetup],
  );
  const savedSetupPending = hasSavedSetup && (projectSetup.state === 'preparing' || projectSetup.state === 'installing' || projectSetup.state === 'starting');
  const runState = projectSetup?.state === 'stopping' ? 'stopping'
    : savedSetupPending && !serverStopPressed ? 'starting' : measuredRunState;
  // The label reads the painted state (ONL-2179); the empty canvas reads the raw record, and its morph absorbs quick phase changes.
  const paintedCreate = usePaintedCreateState();
  const setupPhase = runControlPhase(paintedCreate);
  const isFootOn = useFlag('rail-foot');
  const setupProgress = useImportSetupProgress();
  const hasLiveServer = hasLiveEntry(serverEntries);
  const isBlankProject = useWorkspaceStore((state) => isBlankWorkspace(state.workspace));
  const hasNodes = nodes.length > 0;
  const inspirationId = useCanvasStore((state) => state.inspiration?.frameId ?? null);
  const isOnlyInspiration = nodes.length === 1 && nodes[0]?.id === inspirationId;
  const emptyState = useEmptyCanvasState({ hasLiveServer, hasNodes: hasNodes && !isOnlyInspiration });
  const holdsForInspiration = isOnlyInspiration && (emptyState.kind === 'ideas' || emptyState.kind === 'quiet');
  const agentFailed = useSetupTurnStore((state) => state.agentFailed);
  const centre = canvasCentre({ progress: setupProgress, snapshot: projectSetup, agentFailed, hasNodes, isCreateFailed: paintedCreate?.kind === 'failed', isFootOn });
  const copyStartedAt = useProjectCreateStore((state) => state.copyStartedAt);
  const activationFrames = frameFlowNodes(nodes);
  const activationFailed = emptyState.kind === 'failed' && nodes.length === 0 && !chromeHidden;
  const activation = canvasSurface({ ...(activationFailed ? { emptyFailure: emptyState.stage } : {}), copying: emptyState.kind === 'copying', starting: runState === 'starting' || runState === 'stopping', nodeCount: nodes.length, frames: activationFrames.map((frame) => frame.data) });
  useSurface('canvas', activation.surface, activation.dead_end?.state, activation.dead_end?.error_class);
  const showsSetupPending = setupPhase !== null && nodes.length === 0;
  /** `canSubmitPrompt` alone: the agent host refuses a session outside a project (ONL-1829), and the workspace store misses `workspace:created` after a remount. */
  const canRun = useAgentStore(canSubmitPrompt);

  /** Settle points only, lossy: main debounces, and a lost one costs a `fitView`. */
  const onMoveEnd = (event: { type: string } | null): void => {
    endCameraMotion(event);
    notePanEnd();
    useCanvasStore.getState().noteCameraSettled(getViewport());
  };

  const onMoveStart = (event: { type: string; ctrlKey?: boolean } | null): void => {
    beginCameraMotion(event);
    const kind = panKindOf(event);
    if (kind === undefined) return;
    const frames = frameFlowNodes(useCanvasStore.getState().nodes);
    notePanStart(kind, framesVisible(frames, windowViewRect(screenToFlowPosition, window)));
  };

  useCameraMotionLifetime();

  // Here, not in the toolbar: ⌘. hides the toolbar, and its bindings with it.
  useShortcut('canvas.tool-select', () => {
    setTool('select');
  });
  useShortcut('canvas.tool-pan', () => {
    setTool('pan');
  });
  // Preview folds the add-tools out of the toolbar; their keys go with them.
  const canAdd = mode !== 'interact' && leftPanelView !== 'code';
  const hasSections = useFlag('sections');
  const isStartControlOn = useFlag('start-control');
  const projectPath = useWorkspaceStore((state) => state.workspace?.workspacePath ?? null);
  const wasAppUp = useAppBeenUp(projectPath, hasLiveServer);
  const isInspireTipShown = useInspireTipShown();
  const isCopyYielding = useFlag('blank-first-moment');
  useShortcut('canvas.tool-frame', () => {
    setTool('frame');
  }, { enabled: canAdd });
  useShortcut('canvas.tool-text', () => {
    setTool('text');
  }, { enabled: canAdd });
  useShortcut('canvas.tool-artifact', () => {
    setTool('artifact');
  }, { enabled: canAdd });
  useShortcut('canvas.tool-section', () => {
    setTool('section');
  }, { enabled: canAdd && hasSections });
  // No arming: the picker opens on the press and the result lands at the viewport centre.
  useShortcut('canvas.place-image', openImagePicker, { enabled: canAdd });

  // The ⌘ twins arrive from main through `useCanvasCameraSync` (ONL-1989); a binding here double-fires them.
  useShortcut('canvas.zoom-in-alt', camera.zoomIn);
  useShortcut('canvas.zoom-out-alt', camera.zoomOut);
  useShortcut('canvas.zoom-fit', camera.fitAll);
  useShortcut('canvas.zoom-selection', camera.fitSelection);
  useShortcut('canvas.zoom-actual-alt', camera.zoomActual);

  /* One node, as the menu's verbs: a stack order has no meaning for a group. */
  const stackSelected = (to: 'front' | 'back'): void => {
    const { selectedNodeIds, stackNode } = useCanvasStore.getState();
    const [only] = selectedNodeIds;
    if (selectedNodeIds.length === 1 && only !== undefined) stackNode(only, to);
  };
  useShortcut('canvas.bring-to-front', () => stackSelected('front'));
  useShortcut('canvas.send-to-back', () => stackSelected('back'));

  useShortcut('canvas.duplicate-frame', () => {
    useCanvasStore.getState().duplicateSelectedFrame();
  });

  // On macOS the Edit menu's accelerator takes the chord first; its `edit:undo` lands in `topbar/WindowFrame.tsx` (ONL-2042).
  useShortcut('canvas.undo', () => {
    dispatchCanvasUndo();
  });
  useShortcut('canvas.redo', () => {
    dispatchCanvasRedo();
  });

  // Host-side: the guest only takes focus on an uncancelled mousedown, which the shield cancels (ONL-1779).
  useEscape(() => escapeInlineChat());

  // After the picker's handler: the Escape stack walks newest first, and mid-drag the drag is innermost.
  useEscape(() => {
    const drag = useCanvasStore.getState().duplicateDrag;
    if (drag === null || drag.isCancelled) return false;
    useCanvasStore.getState().cancelDuplicateDrag();
    return true;
  });

  useEscape(() => {
    const state = useCanvasStore.getState();
    if (state.frameDraw !== null) {
      frameDrawSeat.finish();
      state.cancelFrameDraw();
      return true;
    }
    if (isDrawnTool(state.tool)) {
      state.setTool('select');
      return true;
    }
    // A press in flight and the arming go together: a click-to-place draws no stage of its own to cancel first.
    if (state.tool === 'text') {
      textPlaceSeat.finish();
      state.setTool('select');
      return true;
    }
    return false;
  });

  // By identity: with `nodesDraggable` false a node's mousedown bubbles to the pane.
  const onFramePointerDown = (event: React.PointerEvent): void => {
    if (!isDrawnTool(tool) || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    if (!event.target.classList.contains('react-flow__pane')) return;
    const screen = { x: event.clientX, y: event.clientY };
    const state = useCanvasStore.getState();

    frameDrawSeat.finish();
    if (state.frameDraw !== null) state.cancelFrameDraw();
    frameDrawSeat.replace(installFrameDrawWindowSeat(window, event.pointerId, {
      onMove: (moveEvent) => {
        const moveScreen = { x: moveEvent.clientX, y: moveEvent.clientY };
        useCanvasStore
          .getState()
          .updateFrameDraw(screenToFlowPosition(moveScreen), moveScreen);
      },
      onFinish: (finishEvent) => {
        frameDrawSeat.finish();
        const finishScreen = { x: finishEvent.clientX, y: finishEvent.clientY };
        useCanvasStore
          .getState()
          .updateFrameDraw(screenToFlowPosition(finishScreen), finishScreen);
        const method = useCanvasStore.getState().endFrameDraw();
        if (method !== null) {
          // Read at the draw, not closed over, or a mid-gesture switch stamps the outgoing project; main hashes the path or drops it.
          const worktreePath = useWorkspaceStore.getState().workspace?.workspacePath;
          studio().telemetryEvent({
            event: 'frame_created',
            properties: { method, ...(worktreePath === undefined ? {} : { worktreePath }) },
          });
        }
      },
      onCancel: () => {
        frameDrawSeat.finish();
        useCanvasStore.getState().cancelFrameDraw();
      },
    }));
    state.beginFrameDraw(screenToFlowPosition(screen), screen);
  };

  // Capture, and no pane test: an armed press over a node places in front of it, and the shield covers every guest in Design, so a pane click never fires there (ONL-2486).
  // The `.react-flow` containment is what keeps the toolbar and the recenter control out; both are its siblings.
  const onTextPlacePointerDownCapture = (event: React.PointerEvent): void => {
    if (tool !== 'text' || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.react-flow') === null) return;
    event.stopPropagation();
    // Keeps a frame's own address input from taking focus under the press.
    event.preventDefault();
    // The prevented press moves no focus, so an open caret is closed here rather than by the browser.
    if (useCanvasStore.getState().textEditId !== null && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const screen = { x: event.clientX, y: event.clientY };

    textPlaceSeat.finish();
    textPlaceSeat.replace(
      installFrameDrawWindowSeat(window, event.pointerId, {
        onMove: () => undefined,
        onFinish: (finishEvent) => {
          textPlaceSeat.finish();
          // A drag is not a placement: a pan that started here leaves nothing behind.
          if (!isTextPlacementClick(screen, { x: finishEvent.clientX, y: finishEvent.clientY })) {
            return;
          }
          // A placement is not a label: the store reports it at the commit, where one exists (ONL-2486).
          useCanvasStore.getState().placeTextNode(screenToFlowPosition(screen));
        },
        onCancel: () => {
          textPlaceSeat.finish();
        },
      }),
    );
  };

  const onToolChange = (next: typeof tool): void => {
    if (next === 'frame' && useCanvasStore.getState().tool !== 'frame') {
      studio().telemetryEvent({ event: 'frame_tool_armed', properties: {} });
    }
    if (next === 'text' && useCanvasStore.getState().tool !== 'text') {
      studio().telemetryEvent({ event: 'text_tool_armed', properties: {} });
    }
    setTool(next);
  };

  const onRunToggle = (): void => {
    if (showsSetupPending && !hasSavedSetup) return;
    const isEngaged = runState !== 'idle';
    const entries = useServerStore.getState().entries;
    const frameUrls = framePointedUrls(useCanvasStore.getState().nodes);
    if (isEngaged) useServerStore.getState().markStopPressed();
    reportProjectRunIntent(isEngaged, hasSavedSetup, entries, frameUrls);
  };

  return (
    // `data-tool` scopes the frame tool's pane cursor in styles.css.
    <CanvasPaneMenu fitAll={camera.fitAll} paste={pasteFromMenu}>
    <Stack
      style={{ position: 'relative', height: '100%' }}
      data-tool={tool}
      onPointerDownCapture={onTextPlacePointerDownCapture}
      onPointerDown={onFramePointerDown}
    >
      <ReactFlow
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes(ARTIFACT_PLACEMENT_TYPE)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            return;
          }
          if (!event.dataTransfer.types.includes(CANVAS_CLIPBOARD_TYPE)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          if (event.dataTransfer.types.includes(ARTIFACT_PLACEMENT_TYPE)) {
            event.preventDefault();
            void dropLibraryArtifact(event.dataTransfer.getData(ARTIFACT_PLACEMENT_TYPE), screenToFlowPosition({x: event.clientX, y: event.clientY}));
            return;
          }
          if (!event.dataTransfer.types.includes(CANVAS_CLIPBOARD_TYPE)) return;
          event.preventDefault();
          const state = useCanvasStore.getState();
          const pasted = classifyPaste({ get: (type) => event.dataTransfer.getData(type), files: [], promisesImage: false }, { docId: state.doc?.docId ?? null });
          if (pasted.kind === 'nodes') state.pasteCanvasNodes(pasted.nodes, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
        }}
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        // Its own arrow-key move on a focused node reports as a live drag the store never settles; `useNodeNudge` owns the arrows.
        disableKeyboardA11y
        // The stack is the document's `order`, set from the Designs list; a selection that jumped to the front would contradict it.
        elevateNodesOnSelect={false}
        onNodeMouseEnter={(_event, node) => {
          hoverNode(node.id);
        }}
        onNodeMouseLeave={() => {
          hoverNode(null);
        }}
        colorMode="dark"
        minZoom={ZOOM_BOUNDS.min}
        maxZoom={ZOOM_BOUNDS.max}
        /* `defaultViewport`, not an effect's `setViewport`: React Flow initialises after the first effects, so that call is a no-op (ONL-1913). */
        {...(restoredViewport ? { defaultViewport: restoredViewport } : {})}
        /* Never React Flow's own: with no nodes at mount it defers the fit onto whatever arrives first, which made a placed label jump (ONL-2486). */
        fitView={false}
        onMoveStart={onMoveStart}
        onMove={() => { noteCameraMotion(); notePanMove(); }}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        nodeClickDistance={GESTURE_TOLERANCE}
        nodeDragThreshold={GESTURE_TOLERANCE}
        /* `onNodeDragStop` is cleanup, not the settle: React Flow emits the final position change before it, and none when nothing moved. */
        onNodeDragStart={(event, node) => {
          useCanvasStore.getState().beginSectionDrag(node.id);
          if (event.altKey) {
            duplicateDragSeat.replace(
              installDuplicateDragWindowSeat(window, {
                onAltRelease: () => useCanvasStore.getState().cancelDuplicateDrag(),
                onBlur: () => {
                  useCanvasStore.getState().cancelDuplicateDrag();
                  useCanvasStore.getState().endDuplicateDrag();
                },
              }),
            );
            useCanvasStore
              .getState()
              .beginDuplicateDrag(node.id);
          }
        }}
        onNodeDragStop={() => {
          useCanvasStore.getState().endSectionDrag();
          duplicateDragSeat.finish();
          useCanvasStore.getState().endDuplicateDrag();
        }}
        panOnScroll={!isZoomHeld}
        zoomOnScroll={isZoomHeld}
        zoomActivationKeyCode={null}
        /* Meta stays: this prop replaces React Flow's ⌘ default rather than adding to it (ONL-2043). */
        multiSelectionKeyCode={['Shift', 'Meta']}
        selectionKeyCode={selectionGesture.selectionKeyCode}
        selectionOnDrag={selectionGesture.selectionOnDrag}
        /* Partial: frames are large and run off screen, so a containment marquee may not fit the viewport. */
        selectionMode={SelectionMode.Partial}
        panOnDrag={tool === 'pan'}
        /* False while panning: d3-drag stops the mousedown it accepts, so the pan never sees it (ONL-1864). */
        nodesDraggable={tool !== 'pan' && !isSpacePanning}
        /* Hidden (ONL-1814): `@xyflow/react` is MIT and its notice ships in the bundle's licence text; the panel is a request, not an obligation. */
        proOptions={{ hideAttribution: true }}
        data-testid="canvas"
        data-perf-surface="canvas"
        /* The hand shows over the pane, a frame and a frame's shield: three subtrees reachable only from this root. */
        data-space-panning={isSpacePanning ? 'true' : undefined}
      >
        {/* No `<Background>`: it paints its own full-bleed fill over the container (ONL-1814). */}
        <SnapGuides />
        <NodeMeasure />
        <DuplicateDragPreviews />
        <ResizeReadout />
        <FrameDrawPreview />
        <TextDraftNode />
        <TextSizeBar />
        <SelectionDimensionBadge />
      </ReactFlow>

      {/* Outside `<ReactFlow>`: the outline marks the whole region, and inside the viewport portal it would pan with the camera. */}
      <ImageDropOutline />

      <Center style={{ ...canvasSpan(cover), pointerEvents: 'none' }}>
        <EmptyCanvasSlot
          state={emptyState}
          copyStartedAt={copyStartedAt}
          shown={emptyState.kind !== 'unknown' && centre.kind === 'illustration' && (nodes.length === 0 || holdsForInspiration) && !chromeHidden}
          isCaptionHidden={isCopyYielding && isInspireTipShown && emptyState.kind === 'ready'}
          onPick={sendIdea}
        />
      </Center>
      <Center style={{ ...canvasSpan(cover), pointerEvents: 'none' }}>
        <SetupFailureCardSlot card={centre.kind === 'card' && !chromeHidden ? centre.card : null} />
      </Center>


      {/* A canvas-side shadow ramp runs a straight edge past the panels' rounded corners: they are unclipped overlays, each carrying its own shadow (ONL-1889). */}

      {/* Outside the `chromeHidden` wrapper: ⌘. shows the canvas, and this is the control that finds it (ONL-1979). */}
      <RecenterButton />
      <OffscreenSelectionMarks />

      <Center
        style={{
          ...canvasSpan(cover),
          insetBlockStart: 'auto',
          bottom: 'var(--spacing-4)',
          pointerEvents: 'none',
          /* Hidden, not unmounted: the run control keeps its subscription, so a server that starts meanwhile is still measured. */
          ...(chromeHidden ? { display: 'none' } : {}),
        }}
      >
        <Stack align="center" gap={2} style={{ pointerEvents: 'auto' }}>
          {/* Above the toolbar, never a toast and never the composer's band: a refused image is
              the canvas's own news, and the canvas is where the user was looking (ONL-2486). */}
          <CanvasRefusalBand />
          <ImageRefusalBand />
          <CanvasToolbar
            /* Display only: `tool` stays untouched, so releasing Space restores the user's choice. */
            tool={isSpacePanning ? 'pan' : tool}
            onToolChange={onToolChange}
            onPlaceImage={openImagePicker}
            state={showsSetupPending && !hasSavedSetup ? 'starting' : runState}
            {...(showsSetupPending || savedSetupPending
              ? { pendingLabel: t(projectSetup?.state === 'installing' || setupPhase === 'installing' ? 'canvas.run.installing' : 'canvas.run.starting') }
              : {})}
            onRunToggle={onRunToggle}
            isPreview={!canAdd}
            hasFrames={nodes.some((node) => node.type === 'frame')}
            hasSectionTool={hasSections}
            hasRunControl={startControlShown({ isOn: isStartControlOn, isBlankProject, isImportSettingUp: setupHidesRunControl(setupProgress, paintedCreate), hasBeenUp: wasAppUp || hasLiveServer })}
            isRunEnabled={showsSetupPending || hasSavedSetup || canRun || hasStarter}
          />
        </Stack>
      </Center>

      {/* One dialog for the whole canvas: a per-node one would unmount with the node it stands over. */}
      <DeleteArtifactDialog
        isOpen={artifactDeleteAsk !== null}
        title={artifactDeleteAsk?.title ?? ''}
        onOpenChange={(isOpen) => {
          if (!isOpen) endDeleteArtifactAsk();
        }}
        onConfirm={() => {
          if (artifactDeleteAsk !== null) void deleteArtifact(artifactDeleteAsk.nodeId);
          endDeleteArtifactAsk();
        }}
      />
    </Stack>
    </CanvasPaneMenu>
  );
}

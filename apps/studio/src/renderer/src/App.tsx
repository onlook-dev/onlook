import { useEffect, useRef, useState } from 'react';
import { Dialog } from './overlay/Dialog.js';
import { GithubImportFlow, SETTINGS_FLOW_HEIGHT, SETTINGS_FLOW_WIDTH } from './github-import/GithubImport.js';
import { dismissGithub, githubCommand } from './github-import/store.js';
import { ReactFlowProvider } from '@xyflow/react';
import { HStack, Stack } from '@astryxdesign/core/Layout';
import { ResizeHandle, useResizable } from '@astryxdesign/core/Resizable';
import { Canvas } from './canvas/Canvas.js';
import { CanvasModeSwitch } from './canvas/CanvasModeSwitch.js';
import {
  PANEL_LIMITS,
  type PanelsState,
  type ProjectCreateState,
  type WorkspaceCreated,
} from '@studio/events';
import { ConnectFlowProvider } from './canvas/ConnectFlow.js';
import { CanvasCorner } from './canvas/CanvasCorner.js';
import { usePanelCover } from './canvas/panelCover.js';
import { isChromeHidden, isRailHidden, useCanvasStore } from './canvas/store.js';
import { ExportPanel } from './canvas/artifact/ExportPanel.js';
import { useExportPanel } from './canvas/artifact/exportPanelState.js';
import { ChatRegion } from './chat/ChatRegion.js';
import { CodePanelSurface } from './code/CodePanelSurface.js';
import { useLeftPanelView } from './rail/useLeftPanelView.js';
import { t } from '@studio/i18n';
import { REGION } from './layout.js';
import { LogoMenu } from './rail/LogoMenu.js';
import { Rail } from './rail/Rail.js';
import { RailFoot } from './rail/RailFoot.js';
import { RegionErrorBoundary } from './RegionErrorBoundary.js';
import { HAIRLINE, SURFACE } from './panels/rowGeometry.js';
import { subscribeToPanelWidths, usePanelsStore } from './panels/store.js';
import { useSwitchClearance } from './panels/useSwitchClearance.js';
import { LeftPanelContent } from './panels/LeftPanelContent.js';
import { Sidebar } from './sidebar/Sidebar.js';
import { ArtifactSidebar } from './canvas/artifact/ArtifactSidebar.js';
import { EditorBarSlot } from './topbar/EditorBarControls.js';
import { TipsToast } from './tips/TipsToast.js';
import { TipsDialog } from './tips/TipsDialog.js';
import { TourHost } from './tour/TourHost.js';
import { useTipsShortcut } from './tips/TipsButton.js';
import { useTipMoments } from './tips/moment.js';
import { useShortcut } from './shortcuts/index.js';
import { LAYER } from './overlay/layers.js';

export function App({
  restoredWorkspace,
  creating,
  onExitToProjects,
}: {
  restoredWorkspace?: WorkspaceCreated;
  creating?: ProjectCreateState;
  /** A prop, not a context read: the editor's bar controls render at the shared
   * bar, outside this file's provider (ONL-1935). */
  onExitToProjects: () => void;
}): React.JSX.Element {
  const mode = useCanvasStore((state) => state.mode);
  const isInteract = mode === 'interact';
  const isExportOpen = useExportPanel((state) => state.isOpen);

  /* Two ids for one behaviour: the registry is keyed by binding, so its
     conflict guard sees each combo. */
  const chromeHidden = useCanvasStore(isChromeHidden);
  const toggleChrome = useCanvasStore((state) => state.toggleChrome);
  useShortcut('ui.toggle-chrome', toggleChrome);
  useShortcut('ui.toggle-chrome-alt', toggleChrome);
  useTipsShortcut();
  useTipMoments();

  const leftHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  const rightHidden = useCanvasStore((state) => isRailHidden(state, 'right'));
  const isPanelHidden = (edge: 'left' | 'right'): boolean => (edge === 'left' ? leftHidden : rightHidden);

  const panelStyle = (edge: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    [edge]: 0,
    // Declared, not inherited from DOM order: React Flow's root hardcodes
    // `z-index: 0` over any style prop, so ordering here is otherwise invisible.
    zIndex: LAYER.raised,
    // Collapsed, never unmounted: the chat panel is where Create PR and the
    // composer's chips submit prompts. `display: none` keeps its subscriptions
    // alive and takes it out of hit-testing, which `visibility: hidden` leaves
    // as an invisible strip eating canvas drags.
    ...(isPanelHidden(edge) ? { display: 'none' } : {}),
  });

  const isApplyingBroadcast = useRef(false);
  const setWidth = usePanelsStore((state) => state.setWidth);
  const clearance = useSwitchClearance();
  // The left panels sit beside the rail; the chat takes the window's right edge.
  const clearanceFor = (panel: keyof PanelsState): number =>
    clearance === null ? Infinity : panel === 'end' ? clearance.right : clearance.left - REGION.rail;
  const panelResizeConfig = (panel: keyof PanelsState) => ({
    defaultSize: usePanelsStore.getState()[panel],
    minSizePx: PANEL_LIMITS[panel].min,
    maxSizePx: Math.max(PANEL_LIMITS[panel].min, Math.min(PANEL_LIMITS[panel].max, clearanceFor(panel))),
    collapsible: false,
    onSizeChange: (size: number) => {
      if (isApplyingBroadcast.current) return;
      setWidth(panel, size);
    },
  });
  const designs = useResizable(panelResizeConfig('sidebar'));
  const code = useResizable(panelResizeConfig('code'));
  const chat = useResizable(panelResizeConfig('end'));
  const { resize: resizeDesigns } = designs;
  const { resize: resizeCode } = code;
  const { resize: resizeChat } = chat;
  useEffect(
    () =>
      subscribeToPanelWidths((state) => {
        // Another tab's width is applied, never saved again: a narrower cap here would rewrite everyone's (ONL-2744).
        isApplyingBroadcast.current = true;
        resizeDesigns(state.sidebar);
        resizeCode(state.code);
        resizeChat(state.end);
        isApplyingBroadcast.current = false;
      }),
    [resizeDesigns, resizeCode, resizeChat],
  );

  const leftPanelView = useLeftPanelView();
  const isCode = leftPanelView === 'code';
  const left = isCode ? code : designs;

  const covered = usePanelCover();
  const [githubOpen, setGithubOpen] = useState(false);
  const closeGithub = (): void => { dismissGithub(); setGithubOpen(false); };


  return (
    <ConnectFlowProvider
      {...(restoredWorkspace ? { restoredWorkspace } : {})}
      {...(creating ? { creating } : {})}
    >
      <Stack style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* ⚠️ Stays inside `ConnectFlowProvider`'s children: the provider swaps
            them for the project switcher, and unmounting with them takes Create
            PR off a screen where submitting lands in an unseen transcript
            (ONL-1935). */}
        <EditorBarSlot onExitToProjects={onExitToProjects} onConnectGithub={() => {
          setGithubOpen(true);
          void githubCommand({ kind: 'start', entryPoint: 'topbar' });
        }} />
        <Dialog isOpen={githubOpen} onOpenChange={(open) => { if (!open) closeGithub(); }}
          purpose="form" width={SETTINGS_FLOW_WIDTH} maxHeight={SETTINGS_FLOW_HEIGHT} style={{ height: SETTINGS_FLOW_HEIGHT }} data-testid="github-status-dialog">
          {githubOpen && <GithubImportFlow entryPoint="settings" onClose={closeGithub} onOpen={closeGithub} />}
        </Dialog>

        {/* THE PANELS ARE OVERLAYS, NOT COLUMNS: `inset: 0` is what keeps a
            panel from moving React Flow's bounds, measured at 259px of jump on
            the Design→Interact toggle (ONL-1889). */}
        <Stack
          as="main"
          aria-label={t('canvas.region.label')}
          data-testid="canvas-region"
          style={{ position: 'absolute', inset: 0 }}
        >
          <RegionErrorBoundary region="canvas">
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
          </RegionErrorBoundary>
        </Stack>

        <TipsToast />

        <Stack
          aria-hidden
          data-testid="mode-band-surface"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: REGION.modeBand,
            zIndex: LAYER.raised,
            pointerEvents: 'none',
            backgroundColor: 'var(--studio-ground)',
            ...(chromeHidden && !isInteract ? { display: 'none' } : {}),
          }}
        />

        <HStack
          as="aside"
          aria-label={isCode ? t('code.panel.label') : leftPanelView === 'artifacts' ? t('rail.artifacts') : t('sidebar.label')}
          width={REGION.rail + left.size}
          className="left-panel-width"
          data-testid="sidebar"
          style={panelStyle('left')}
        >
          <Rail head={<LogoMenu />} {...(isInteract ? {} : { foot: <RailFoot /> })} />
          <RegionErrorBoundary region="sidebar" key={leftPanelView}
            fallbackStyle={{ flex: '1 1 auto', minWidth: 0, ...SURFACE, borderRight: HAIRLINE }}>
            <LeftPanelContent view={leftPanelView} width={left.size - 1}>
              {isCode ? <CodePanelSurface /> : leftPanelView === 'artifacts' ? <ArtifactSidebar /> : <Sidebar />}
            </LeftPanelContent>
          </RegionErrorBoundary>
          {!leftHidden && <ResizeHandle
            resizable={left.props}
            tabIndex={-1}
            aria-hidden="true"
            className="panel-resize-handle"
          >
            <span aria-hidden="true" className="panel-resize-edge" />
          </ResizeHandle>}
        </HStack>

        <HStack
          as="aside"
          aria-label={t('chat.title')}
          width={chat.size}
          data-testid="chat-region"
          style={panelStyle('right')}
        >
          {!rightHidden && <ResizeHandle
            resizable={chat.props}
            isReversed
            tabIndex={-1}
            aria-hidden="true"
            className="panel-resize-handle"
          >
            <span aria-hidden="true" className="panel-resize-edge" />
          </ResizeHandle>}
          <RegionErrorBoundary region="chat">
            {/* Over the chat, not instead of it: the draft and scroll survive an export (ONL-2593). */}
            <div style={{ position: 'relative', display: 'flex', flex: '1 1 auto', minWidth: 0, minHeight: 0 }}>
              {/* Hidden, not unmounted: the export panel is translucent (ONL-2593). */}
              <div style={{ display: 'flex', flex: '1 1 auto', minWidth: 0, minHeight: 0, ...(isExportOpen ? { visibility: 'hidden' } : {}) }}>
                <ChatRegion />
              </div>
              <ExportPanel />
            </div>
          </RegionErrorBoundary>
        </HStack>

        <CanvasCorner cover={covered} />
        <TipsDialog />
        <TourHost />

        {/* `pointer-events: none` so the empty band never eats a canvas drag;
            the switch opts back in on itself. Centred on the window, not the
            uncovered canvas: the cover changes with the mode (ONL-2593). */}
        <Stack
          align="center"
          justify="center"
          style={{
            position: 'absolute',
            top: 0,
            insetInline: 0,
            height: REGION.modeBand,
            pointerEvents: 'none',
            zIndex: LAYER.over,
            /* The switch stays visible IN INTERACT: a click into the guest
               `<webview>` gives the host document no key events, so ⌘. never
               arrives and hiding the switch too strands the user. */
            ...(chromeHidden && !isInteract ? { display: 'none' } : {}),
          }}
          data-testid="mode-band"
        >
          <CanvasModeSwitch />
        </Stack>
      </Stack>
    </ConnectFlowProvider>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import type { WebviewTag } from 'electron';
import { useShallow } from 'zustand/react/shallow';
import { useStore as useFlowStore, ViewportPortal, type NodeProps } from '@xyflow/react';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Text } from '@astryxdesign/core/Text';
import {
  artifactPageUrl,
  CANVAS_ARTIFACT_DEFAULT_BOX,
  shownOverArtifact,
  type AnchorRect,
  type ArtifactId,
  type ArtifactPreviewRequest,
  type ArtifactReadState,
  type ArtifactSummary,
} from '@studio/events';

import { noteArtifactRead } from '../../diagnostics/registry.js';
import { t } from '@studio/i18n';
import { ARTIFACT_ACCENT_ATTRS } from '../artifactAccent.js';
import { frameRingScale, isChromeVisible } from '../frame/geometry.js';
import { FrameRing } from '../frame/FrameRing.js';
import { FrameQuote } from '../frame/FrameQuote.js';
import { useFlag } from '../../flags/store.js';
import { CanvasNodeMenu } from '../menu/CanvasNodeMenu.jsx';
import {
  MAX_FRAME_SIZE,
  MIN_FRAME_SIZE,
  resizeCeiling,
  resizeFloor,
  type ArtifactFlowNode,
} from '../model.js';
import { NodeResizeHandles } from '../NodeResizeHandles.jsx';
import { armedNodeId, drawnImageBox, isFrameShielded, useCanvasStore } from '../store.js';
import { forgetArtifact, peekArtifact, resolveArtifact, servesPage, subscribeArtifact } from './artifactCache.js';
import { artifactPreviewDemand, previewRequestFor } from './previewDemand.js';
import { isArtifactPickerLive, useArtifactPicker } from './useArtifactPicker.js';
import { focusedFrameId } from '../elementPicking.js';
import { shownRecord } from '../useInlineElementChat.js';
import { anchorFlowBox, nodeAnchorRect } from '../inlinePlacement.js';
import { useInlineChatPresence } from '../useInlineChatPresence.js';
import { InlineElementChat } from '../InlineElementChat.js';
import { ArtifactTitle } from './ArtifactTitle.js';
import { openExportPanel } from './exportPanelState.js';
import { ExportIcon, ReloadIcon } from '../../icons/glyphs.js';
import { NAV_CONTROL } from '../frame/FrameToolbar.js';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Icon } from '@astryxdesign/core/Icon';
import { useArtifactListing } from './listing.js';
import { isNodeWorking, subscribeWorkingNodes } from '../frameFacts.js';
import { ArtifactWebview } from './ArtifactWebview.js';
import { ArtifactTextEditor, ArtifactTextRefusal } from './ArtifactTextEditor.js';
import { useArtifactTextEditing } from './useArtifactTextEditing.js';
import { studio } from '../../bridge.js';
import '../canvas.css';

const LABEL_GAP = 2;
/** Screen px: the gap plus `LABEL_ROW`'s `--spacing-6` floor. */
const LABEL_ABOVE = LABEL_GAP + 24;

const MUTED_BOX = {
  backgroundColor: 'var(--color-background-muted)',
} as const;

export interface ArtifactNodeSurfaceProps {
  nodeId?: string;
  title: string;
  state: ArtifactReadState;
  /** Present exactly when `state` is `resolved`. */
  url?: string;
  isSelected: boolean;
  isHovered?: boolean;
  /** The agent is changing this artifact: its title shimmers (ONL-2593). */
  isWorking?: boolean;
  isFocused?: boolean;
  zoom?: number;
  /** A `<webview>` is a native surface the host gets no mouse events over, so the canvas needs a shield in front of it (ONL-1863). */
  isShielded?: boolean;
  /** Offered only from `missing`, and it removes the node, never the artifact. */
  onRemoveNode?: () => void;
  webviewRef?: RefObject<WebviewTag | null>;
  revision?: string;
  picker?: ReturnType<typeof useArtifactPicker>;
  outlines?: React.ReactNode;
  artifact?: ArtifactSummary;
  onRefresh?: () => void;
  refreshNonce?: number;
  /** The artifact page's last rendered picture, shown until this node's guest paints its own (ONL-2791). */
  cover?: string;
  onPainted?: (paintedRevision: string | null) => void;
  /** The brief this artifact stands for until its first write lifts it; shown over the page and over `missing` (ONL-2960). */
  quote?: string;
  size?: { width: number; height: number };
}

/** Whole pixels, worn at rest too: a fractional box paints a 1px edge as two half-strength rows (ONL-2593). */
/** Rounded on the screen, not on the canvas: a 1px edge between device pixels smears to a pale line (ONL-2744). */
function snappedBox(rect: AnchorRect, zoom: number): { left: number; top: number; width: number; height: number } {
  const scale = Math.max(zoom, 0.01);
  const snap = (value: number): number => Math.round(value * scale) / scale;
  const left = snap(rect.x);
  const top = snap(rect.y);
  return { left, top, width: snap(rect.x + rect.width) - left, height: snap(rect.y + rect.height) - top };
}

const LABEL_LINE = { display: 'block', verticalAlign: 'top', maxWidth: '100%', minWidth: 0 } as const;
// Held at the export button's height whether or not it shows, so selecting never moves the title (ONL-2744).
const LABEL_ROW = { display: 'grid', gridTemplateColumns: 'var(--spacing-6) minmax(0, 1fr) var(--spacing-6)', alignItems: 'center', gap: 6, width: '100%', minWidth: 0, minHeight: 'var(--spacing-6)' } as const;

function stopControlKeys(event: React.KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
}

export function ArtifactNodeSurface({
  nodeId,
  title,
  state,
  url,
  isSelected,
  isHovered = false,
  isWorking = false,
  isFocused = false,
  zoom = 1,
  isShielded = false,
  onRemoveNode,
  webviewRef,
  revision,
  picker,
  outlines,
  artifact,
  onRefresh,
  refreshNonce = 0,
  cover,
  onPainted,
  quote,
  size = CANVAS_ARTIFACT_DEFAULT_BOX,
}: ArtifactNodeSurfaceProps): React.JSX.Element {
  const scale = frameRingScale(zoom);
  return (
    <div
      data-testid="canvas-artifact-node"
      data-artifact-state={state}
      {...ARTIFACT_ACCENT_ATTRS}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* The frame's URL-bar rule, so the name stays put to be clicked; focus counts as a click into the guest. */}
      {(isChromeVisible({ zoom, isSelected: isSelected || isFocused }) || isHovered) && (
        <div
          data-testid="canvas-artifact-label"
          style={{
            position: 'absolute',
            left: 0,
            bottom: `calc(100% + ${String(LABEL_GAP * scale)}px)`,
            transform: `scale(${String(scale)})`,
            transformOrigin: 'bottom left',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
            // The artifact's own width, before the counter-scale: a long title ends in "…" at its right edge (ONL-2593).
            width: `${String(100 / scale)}%`,
            cursor: 'grab',
          }}
        >
          <div style={LABEL_ROW}>
            <div>
              {isSelected && onRefresh !== undefined ? <IconButton
                label={t('artifact.refresh')}
                tooltip={t('artifact.refresh')}
                variant="ghost"
                size="sm"
                className="frame-nav-control nodrag nopan"
                style={NAV_CONTROL}
                icon={<Icon icon={ReloadIcon} size="sm" color="inherit" />}
                onKeyDown={stopControlKeys}
                onPointerDown={(event: React.PointerEvent) => event.stopPropagation()}
                onClick={(event: React.MouseEvent) => { event.stopPropagation(); onRefresh(); }}
                data-testid="canvas-artifact-refresh"
              /> : null}
            </div>
            <Text size="sm" color="secondary" style={{ ...LABEL_LINE, textAlign: 'center', ...(isSelected || isHovered ? { color: 'var(--color-accent)' } : {}) }}>
              <ArtifactTitle artifact={artifact} label={title} fitText draggable renameOnDoubleClick isShimmering={isWorking} />
            </Text>
            {/* Selected only: the one place a designer looks for what to do with this artifact (ONL-2744). */}
            {isSelected && artifact !== undefined ? (
              <IconButton
                label={t('artifact.export.button')}
                tooltip={t('artifact.export.button')}
                variant="ghost"
                size="sm"
                className="frame-nav-control nodrag nopan"
                style={NAV_CONTROL}
                icon={<Icon icon={ExportIcon} size="sm" color="inherit" />}
                onKeyDown={stopControlKeys}
                onPointerDown={(event: React.PointerEvent) => event.stopPropagation()}
                onClick={() => openExportPanel()}
                data-testid="canvas-artifact-export"
              />
            ) : null}
          </div>
        </div>
      )}

      {/* The clip is the SURFACE's, never the node's: the label sits above the box, and a
          clipping node root cut it off entirely (ONL-2568). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          ...MUTED_BOX,
          overflow: 'hidden',
        }}
      >
      {state === 'resolved' && url !== undefined ? (
        /* A `<webview>`, never an iframe: the partition is what main contains it by. */
        <ArtifactWebview key={refreshNonce} url={url} revision={revision} snapshotRevision={artifact?.updatedAt} {...(cover === undefined ? {} : { cover })} {...(onPainted === undefined ? {} : { onPainted })} {...(onRefresh === undefined ? {} : { onRetry: onRefresh })} webviewRef={webviewRef} nodeId={nodeId} />
      ) : null}

      <FrameQuote quote={quote} isBuilding={isWorking} width={size.width} height={size.height} canvasZoom={zoom} />

      {/* In front of the guest, or a gesture crossing the artifact loses its pointermove and
          pointerup to a surface the host never sees (ONL-1863). */}
      {state === 'resolved' && isShielded ? (
        <div
          data-testid="canvas-artifact-shield"
          {...picker}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}

      {/* Nothing offered while the read is in flight: a project open would otherwise offer to
          remove every artifact node before any of them had resolved (ONL-2486). */}
      {state === 'missing' && quote === undefined ? (
        <Center style={{ position: 'absolute', inset: 0, padding: 'var(--spacing-2)' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <Text size="sm" color="secondary" data-testid="canvas-artifact-missing">
              {t('canvas.artifact.missing', { title })}
            </Text>
            {onRemoveNode === undefined ? null : (
              <Button
                size="sm"
                variant="secondary"
                label={t('canvas.artifact.removeNode')}
                data-testid="canvas-artifact-remove-node"
                onClick={onRemoveNode}
              />
            )}
          </div>
        </Center>
      ) : null}
      </div>
      {outlines}
      <FrameRing zoom={zoom} isEmphasised={isSelected || isHovered || isFocused} accent="artifact" />
    </div>
  );
}

/** A read that has not landed for THIS id is `reading`, never `missing` (ONL-2486). */
export function artifactReadState(
  artifactId: ArtifactId,
  read: { id: ArtifactId; summary: ArtifactSummary | null } | null,
  pagePath?: string,
): { state: ArtifactReadState; url?: string } {
  if (read === null || read.id !== artifactId) return { state: 'reading' };
  if (read.summary === null) return { state: 'missing' };
  if (!servesPage(read.summary, pagePath)) return { state: 'missing' };
  return { state: 'resolved', url: artifactPageUrl(artifactId, pagePath ?? read.summary.pagePath) };
}

function useArtifactRead(artifactId: ArtifactId, pagePath?: string): {
  state: ArtifactReadState;
  url?: string;
  title?: string;
  updatedAt?: string;
  revision?: string;
  pickerRevision: string;
  artifact?: ArtifactSummary;
} {
  const [read, setRead] = useState<{ id: ArtifactId; summary: ArtifactSummary | null; generation: number } | null>(
    () => {
      const held = peekArtifact(artifactId);
      return held === undefined ? null : { id: artifactId, summary: held, generation: 0 };
    },
  );
  const [generation, setGeneration] = useState({ read: 0, content: 0 });

  // A delete forgets the cached hit; without this the node keeps showing bytes that are gone (ONL-2568).
  useEffect(
    () =>
      subscribeArtifact(artifactId, (reason) => {
        setGeneration((previous) => ({ read: previous.read + 1, content: previous.content + (reason === 'content' ? 1 : 0) }));
      }, 'all'),
    [artifactId],
  );

  useEffect(() => {
    let isLive = true;
    void resolveArtifact(artifactId).then((summary) => {
      // `undefined` is a refused bridge, not an absence: the node stays pending.
      if (isLive && summary !== undefined) setRead({ id: artifactId, summary, generation: generation.content });
    });
    return () => {
      isLive = false;
    };
  }, [artifactId, generation]);

  const resolved = artifactReadState(artifactId, read, pagePath);
  const summary = read?.summary;
  return {
    ...resolved,
    pickerRevision: `${artifactId}:${generation.content}:${summary?.updatedAt ?? ''}`,
    ...(summary == null || read === null ? {} : { artifact: summary, title: summary.title, updatedAt: summary.updatedAt, revision: `${summary.updatedAt}:${read.generation}` }),
  };
}

export function ArtifactNode({
  id,
  data,
  selected,
  width,
  height,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<ArtifactFlowNode>): React.JSX.Element {
  const zoom = useFlowStore((state) => state.transform[2]);
  const isHovered = useCanvasStore((state) => state.hoveredNodeId === id);
  const [fieldFocused, setIsFocused] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const elementFocused = useCanvasStore((state) => focusedFrameId(state) === id);
  const isFocused = fieldFocused || elementFocused;
  const isArmed = useCanvasStore((state) => armedNodeId(state) === id);
  const removeFrame = useCanvasStore((state) => state.removeFrame);
  const read = useArtifactRead(data.artifactId, data.pagePath);
  const webviewRef = useRef<WebviewTag>(null);
  const [hoverRect, setHoverRect] = useState<AnchorRect | null>(null);
  const pickerLive = useCanvasStore((state) => isArtifactPickerLive(state, id));
  const isBriefOn = useFlag('frame-covers');
  const shows = shownOverArtifact({ quote: isBriefOn ? data.quote : undefined, turnRunning: data.quoteTurnRunning === true, state: read.state });
  const quote = shows.kind === 'quote' ? shows.quote : undefined;
  const textEditing = useArtifactTextEditing(id, webviewRef, read.url, read.updatedAt, `${read.pickerRevision}:${refreshNonce}`);
  const picker = useArtifactPicker(id, webviewRef, read.url, read.updatedAt, `${read.pickerRevision}:${refreshNonce}`, setHoverRect, textEditing.begin);
  const selections = useCanvasStore((state) => state.elementSelections);
  const rects = useCanvasStore((state) => state.elementAnchorRects);
  const inline = useCanvasStore(useShallow((state) => {
    const shown = shownRecord(state);
    const record = shown?.anchor === 'node' ? (shown.anchorId === id ? shown : null) : focusedFrameId(state) === id ? shown : null;
    return record === null ? null : { ...record, draft: '' };
  }));
  const isNodeChat = inline?.anchor === 'node';
  const nodeRect = useMemo(() => isNodeChat ? nodeAnchorRect({ width: width ?? 0, height: height ?? 0 }, LABEL_ABOVE, zoom) : undefined, [isNodeChat, width, height, zoom]);
  const anchor = inline === null ? undefined : nodeRect ?? rects[inline.anchorId];
  const presence = useInlineChatPresence(inline, anchor);
  // Behind the diagnostics gate, inert without it: a read settles between two polls (ONL-2568).
  useEffect(() => {
    noteArtifactRead({ nodeId: id, artifactId: data.artifactId, state: read.state });
  }, [id, data.artifactId, read.state]);
  const posterRequest = useMemo(
    (): ArtifactPreviewRequest | undefined => read.state === 'resolved' && read.artifact !== undefined
      ? previewRequestFor(data.artifactId, data.pagePath, read.artifact)
      : undefined,
    [read.state, read.artifact, data.artifactId, data.pagePath],
  );
  // Subscribed, never read once: a picture main already held arrives a beat after mount, and a rail
  // warm can land one later still, with nothing else to repaint this node (ONL-2791).
  const subscribeCover = useCallback(
    (changed: () => void) => posterRequest === undefined ? () => {} : artifactPreviewDemand.cover(posterRequest, changed),
    [posterRequest],
  );
  const readCover = useCallback(
    () => posterRequest === undefined ? undefined : artifactPreviewDemand.poster(posterRequest),
    [posterRequest],
  );
  const cover = useSyncExternalStore(subscribeCover, readCover, readCover);
  const [paintedRevision, setPaintedRevision] = useState<string | null>(null);
  // Compared, never stored as a flag: an edit changes the request in the same render that retires the
  // paint, so a stale `true` cannot ask for the new revision while the designer waits on it (ONL-2791).
  const isPainted = posterRequest !== undefined && paintedRevision === posterRequest.updatedAt;
  // Never at mount: a cold watch renders this page offscreen in main, against the page the designer is waiting for (ONL-2791).
  useEffect(() => {
    if (!isPainted || posterRequest === undefined) return undefined;
    const release = artifactPreviewDemand.watch(posterRequest, () => {});
    return () => {
      release();
    };
  }, [isPainted, posterRequest]);
  const isShielded = useCanvasStore((state) => isFrameShielded(state, id));
  const isWorking = useSyncExternalStore(subscribeWorkingNodes, () => isNodeWorking(id), () => false);
  // The listing first: a rename lands there at once, before the store's echo reaches this node's read (ONL-2593).
  const listedTitle = useArtifactListing((state) => state.records?.find((artifact) => artifact.id === data.artifactId)?.title);
  const title = listedTitle ?? read.title ?? data.title;
  // Bounds from the settled size, never React Flow's measurement, which is a ResizeObserver reading.
  const settledWidth = useCanvasStore((state) => state.doc?.nodes[id]?.width);
  const settledHeight = useCanvasStore((state) => state.doc?.nodes[id]?.height);
  const drawnWidth = useCanvasStore((state) => drawnImageBox(state, id)?.width);
  const drawnHeight = useCanvasStore((state) => drawnImageBox(state, id)?.height);
  const resizeBounds = {
    minWidth: resizeFloor(MIN_FRAME_SIZE.width, settledWidth ?? width),
    minHeight: resizeFloor(MIN_FRAME_SIZE.height, settledHeight ?? height),
    maxWidth: resizeCeiling(MAX_FRAME_SIZE.width, settledWidth ?? width),
    maxHeight: resizeCeiling(MAX_FRAME_SIZE.height, settledHeight ?? height),
  };

  return (
    <><CanvasNodeMenu
      nodeId={id}
      readZoom={() => zoom}
    >
      <div
        {...ARTIFACT_ACCENT_ATTRS}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false);
        }}
        style={{
          position: 'relative',
          width: drawnWidth ?? width ?? '100%',
          height: drawnHeight ?? height ?? '100%',
        }}
      >
        <ArtifactNodeSurface
          nodeId={id}
          title={title}
          artifact={read.artifact}
          state={read.state}
          {...(read.url === undefined ? {} : { url: read.url })}
          isSelected={selected}
          isHovered={isHovered}
          isWorking={isWorking}
          isFocused={isFocused}
          zoom={zoom}
          isShielded={isShielded}
          webviewRef={webviewRef}
          revision={read.revision}
          refreshNonce={refreshNonce}
          {...(cover === undefined ? {} : { cover })}
          onPainted={setPaintedRevision}
          onRefresh={() => {
            forgetArtifact(data.artifactId, 'retry');
            setRefreshNonce((value) => value + 1);
            studio().telemetryEvent({event: 'artifact_refreshed', properties: {count: 1}});
          }}
          {...(quote === undefined ? { picker } : { quote })}
          size={{ width: drawnWidth ?? settledWidth ?? width ?? CANVAS_ARTIFACT_DEFAULT_BOX.width, height: drawnHeight ?? settledHeight ?? height ?? CANVAS_ARTIFACT_DEFAULT_BOX.height }}
          outlines={[
            ...(hoverRect === null || !isShielded || !pickerLive || quote !== undefined ? [] : [<div key="hover" data-testid="artifact-element-hover" aria-hidden="true" style={{ position: 'absolute', ...snappedBox(hoverRect, zoom), boxSizing: 'border-box', border: `${frameRingScale(zoom)}px solid var(--color-accent)`, pointerEvents: 'none' }} />]),
            ...selections.flatMap((selection) => {
              const rect = selection.frameNodeId === id && !selection.stale ? rects[selection.evidence.id] : undefined;
              return rect ? [<div key={selection.evidence.id} data-testid="artifact-element-outline" aria-hidden="true" style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, boxSizing: 'border-box', border: `${2 * frameRingScale(zoom)}px solid var(--color-accent)`, pointerEvents: 'none' }} />] : [];
            }),
          ]}
          {...(read.state === 'missing'
            ? {
                onRemoveNode: (): void => {
                  // The node, never the artifact: another node may still show it (ONL-2568).
                  removeFrame(id);
                },
              }
            : {})}
        />
        {textEditing.editing !== null && <ArtifactTextEditor
          key={textEditing.editing.target.token}
          target={textEditing.editing.target}
          stale={textEditing.stale}
          zoom={zoom}
          onSave={(newText) => textEditing.stale ? Promise.resolve({ outcome: 'stale' }) : studio().artifactTextSave({ token: textEditing.editing!.target.token, newText })}
          onDone={textEditing.close}
          onCancel={textEditing.close}
        />}
        {textEditing.refusal !== null && <ArtifactTextRefusal message={textEditing.refusal} zoom={zoom} onDismiss={textEditing.dismissRefusal} />}
        {isArmed && (
          <NodeResizeHandles
            id={id}
            testId="canvas-artifact-resize-handle"
            scale={frameRingScale(zoom)}
            bounds={resizeBounds}
          />
        )}
      </div>
    </CanvasNodeMenu>
    {presence !== null && textEditing.editing === null && !textEditing.preparing && textEditing.refusal === null && <ViewportPortal><InlineElementChat record={presence.record} exit={presence.exit} box={anchorFlowBox({ rect: presence.rect, guestZoom: 1, origin: { x: positionAbsoluteX, y: positionAbsoluteY } })} frame={{ x: positionAbsoluteX, width: width ?? 0 }} /></ViewportPortal>}
    </>
  );
}

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { WebviewTag } from 'electron';
import { useShallow } from 'zustand/react/shallow';
import { FrameRunIntentContext } from './runIntent.js';
import {
  useReactFlow,
  useStore as useFlowStore,
  ViewportPortal,
  type NodeProps,
} from '@xyflow/react';

import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Center } from '@astryxdesign/core/Center';
import { Stack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { t, type StringKey } from '@studio/i18n';
import { GlyphLoadingCircle, WindowGlyph } from '../../icons/glyphs.js';
import { REGION } from '../../layout.js';
import { DEFAULT_FRAME_SIZE, displayUrl, frameServerCover, frameUnderQuote, isStartableCover, matchServerPort, shownOverFrame, type FrameServerCover } from '@studio/events';
import {
  frameRecoveryUrl,
  frameShownFacts,
  MAX_FRAME_SIZE,
  MIN_FRAME_SIZE,
  resizeCeiling,
  resizeFloor,
  type FrameNode as FrameNodeType,
} from '../model.js';
import { CanvasNodeMenu } from '../menu/CanvasNodeMenu.jsx';
import { FrameRing } from './FrameRing.jsx';
import { focusedFrameId } from '../elementPicking.js';
import { armedNodeId, isFrameShielded, useCanvasStore } from '../store.js';
import { NodeResizeHandles } from '../NodeResizeHandles.jsx';
import { FrameQuote } from './FrameQuote.js';
import { frameCover, isAskableCover, olderCover, type CoverAction } from './coverState.js';
import { coverAsk } from './coverAsk.js';
import { FrameCover } from './FrameCover.js';
import { useHeldCover } from './useHeldCover.js';
import { useFlag } from '../../flags/store.js';
import { canSubmitPrompt, useAgentStore } from '../../agent/store.js';
import {
  chromeScale,
  FRAME_CHROME_ABOVE,
  guestPointFrom,
  isAddressUnderModeSwitch,
  isChromeCompact,
  isPickerLive,
  readGuestZoom,
  isChromeVisible,
} from './geometry.js';
import { InlineElementChat } from '../InlineElementChat.jsx';
import { anchorFlowBox, nodeAnchorRect, type InlineChatRecord } from '../inlinePlacement.js';
import { useInlineChatPresence } from '../useInlineChatPresence.js';
import { expandInlineChat, releaseFieldFocus, shownRecord } from '../useInlineElementChat.js';
import { FrameToolbar } from './FrameToolbar.jsx';
import { loadFailureCopy, type FrameLoadFailure } from './loadFailure.js';
import { useFrameWebview } from './useFrameWebview.js';
import { useFrameAttachUrl } from './useFrameAttachUrl.js';
import { bindGuestReady } from './guestReady.js';
import { ignoreRefusal } from '../../refusal.js';
import { isFrameReadable } from './idle.js';
import { useFrameIdle } from './useFrameIdle.js';
import { useLatestRef } from '../../useLatestRef.js';
import { useTabFrames } from './tabFrames.js';
import { FrameIdleThumbnail } from './FrameIdleThumbnail.js';
import { FrameScrollbar } from './FrameScrollbar.js';
import { scrollbarEligible } from './scrollbarGeometry.js';
import { frameWheelScroll, isScrollKeyOn as scrollKeyOnFrame, noteKeyScroll, pointFrame, useScrollKeyStore } from './scrollKey.js';
import { useFrameScroll } from './useFrameScroll.js';
import { useCameraMotion } from '../cameraMotion.js';
import { isGestureInFlight, useFramePicker } from './useFramePicker.js';
import { FrameRecovery, useRecoveryAsk } from './FrameRecovery.js';
import { useServerStore } from '../../server/store.js';
import { useStartUnderWay } from '../../server/useStartUnderWay.js';
import { studio } from '../../bridge.js';
import '../canvas.css';
import './frame.css';

function shownInlineChat(
  state: Parameters<typeof focusedFrameId>[0] & Parameters<typeof shownRecord>[0],
  id: string,
): InlineChatRecord | null {
  const record = shownRecord(state);
  if (record?.anchor === 'node') return record.anchorId === id ? record : null;
  return focusedFrameId(state) === id ? record : null;
}

// The node box is the page's viewport box: the chrome hangs outside the flow, counter-scaled, since an in-flow bar resizes the page on every zoom step (ONL-1862).
export function FrameNode({
  id,
  data,
  selected,
  width,
  height,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<FrameNodeType>): React.JSX.Element {
  const reportRunIntent = useContext(FrameRunIntentContext);
  const webviewRef = useRef<WebviewTag | null>(null);
  const isHovered = useCanvasStore((state) => state.hoveredNodeId === id);
  const isFocused = useCanvasStore((state) => focusedFrameId(state) === id);
  const hasHeldElement = useCanvasStore((state) =>
    state.elementSelections.some((selection) => selection.frameNodeId === id),
  );
  const isResizing = useCanvasStore((state) => state.resizeInFlightId === id);
  const isArriving = useCanvasStore((state) => state.inspiration?.frameId === id);
  // A multi-selection wears no handles: on one member they read as singling it out.
  // A picked element keeps its frame's handles, so the frame stays resizable while the bubble is up.
  const isArmed = useCanvasStore((state) => armedNodeId(state) === id);
  const tool = useCanvasStore((state) => state.tool);
  const isSpacePanning = useCanvasStore((state) => state.isSpacePanning);
  const mode = useCanvasStore((state) => state.mode);
  const isPicking = useCanvasStore((state) => state.isPicking);
  // Without the draft: a keystroke must not re-render the frame. `InlineElementChat` reads the draft itself.
  const inlineChat = useCanvasStore(
    useShallow((state) => {
      const record = shownInlineChat(state, id);
      return record === null ? null : { ...record, draft: '' };
    }),
  );
  const elementAnchorRect = useCanvasStore((state) => {
    const record = shownInlineChat(state, id);
    return record === null ? undefined : state.elementAnchorRects[record.anchorId];
  });
  const { getViewport } = useReactFlow();
  const needsZoom = selected || isArmed || inlineChat !== null || data.health !== 'live' || data.serverCover !== undefined;
  const zoom = useFlowStore((state) => needsZoom ? state.transform[2] : 1);
  const isNodeChat = inlineChat?.anchor === 'node';
  const isChromeShownForChat = isChromeVisible({ zoom, isSelected: selected });
  const nodeRect = useMemo(
    () =>
      isNodeChat
        ? nodeAnchorRect(
            { width: width ?? 0, height: height ?? 0 },
            isChromeShownForChat ? FRAME_CHROME_ABOVE : 0,
            zoom,
          )
        : undefined,
    [isNodeChat, width, height, isChromeShownForChat, zoom],
  );
  const inlinePresence = useInlineChatPresence(inlineChat, nodeRect ?? elementAnchorRect);
  // A boolean, so a pan tick that does not cross the line ends at the store's equality check.
  const isAddressOccluded = useFlowStore((state) =>
    isAddressUnderModeSwitch({
      frameTop: state.transform[1] + positionAbsoluteY * state.transform[2],
      frameLeft: state.transform[0] + positionAbsoluteX * state.transform[2],
      frameWidth: (width ?? 0) * state.transform[2],
      bandBottom: REGION.modeBand,
      switchStart: (state.width - REGION.modeSwitch) / 2,
      switchEnd: (state.width + REGION.modeSwitch) / 2,
    }),
  );
  const isChromeCompactNow = useFlowStore((state) =>
    isChromeCompact((width ?? 0) * state.transform[2]),
  );
  const discarded = useTabFrames((state) => state.discarded);
  const discardEpoch = useTabFrames((state) => state.epoch);
  // The nonce is the webview's `key`: a remount survives a wedged renderer or dead HMR socket that `reload()` does not (ONL-1922).
  // `null` until the first refresh so `src` tracks `homeUrl`; after it the url changes only with the nonce.
  const [refresh, setRefresh] = useState<{
    nonce: number;
    url: string;
    bypassCache: boolean;
    epoch: number;
    discardEpoch: number;
  } | null>(null);
  const guestEpoch = data.guestEpoch ?? 0;
  // A refresh from an older epoch would revive the next guest at the dead one's address; the nonce survives it, keeping `guestInstance` monotonic.
  const refreshCurrent = refresh !== null && refresh.epoch === guestEpoch && refresh.discardEpoch === discardEpoch ? refresh : null;
  const mountNonce = refresh?.nonce ?? 0;
  const mountUrl = refreshCurrent?.url ?? data.homeUrl;
  const attempt = `${mountNonce}:${guestEpoch}:${discardEpoch}`;
  const attachmentKey = JSON.stringify([mountUrl, attempt]);
  const [blockedAttachment, setBlockedAttachment] = useState<{ key: string; entries: ReturnType<typeof useCanvasStore.getState>['serverEntries'] } | null>(null);
  const serverEntries = useCanvasStore((state) => blockedAttachment === null ? null : state.serverEntries);
  const onAttachRefused = useCallback((reason: 'blocked' | 'unavailable') => {
    if (reason === 'blocked') setBlockedAttachment({ key: attachmentKey, entries: useCanvasStore.getState().serverEntries });
    useCanvasStore.getState().patchFrame(id, { health: 'unreachable' });
  }, [attachmentKey, id]);
  useEffect(() => {
    if (blockedAttachment === null || (blockedAttachment.key === attachmentKey && blockedAttachment.entries === serverEntries)) return;
    setBlockedAttachment(null);
    useCanvasStore.getState().patchFrame(id, { health: 'loading' });
  }, [blockedAttachment, attachmentKey, serverEntries, id]);
  const serverCover = data.serverCover ?? (blockedAttachment?.key === attachmentKey && blockedAttachment.entries === serverEntries ? 'dead' : undefined);
  const recoveryUrl = frameRecoveryUrl(data);
  const effectiveHealth = serverCover !== undefined ? 'unreachable' : data.health;
  const startUnderWay = useStartUnderWay();
  const shownFacts = { ...frameShownFacts(data), cover: serverCover, serverStarting: data.serverStarting === true || startUnderWay !== null };
  const under = frameUnderQuote(shownFacts);
  const coversOn = useFlag('frame-covers');
  const older = olderCover({ serverCover, serverStarting: data.serverStarting === true, health: data.health, serverLive: data.serverLive === true, loadFailure: data.loadFailure });
  const isDead = coversOn ? under.kind === 'load-failed' || under.kind === 'unreachable' : older.isDead;
  const canAsk = useAgentStore(canSubmitPrompt);
  const recoveryDetail = t(serverCover === undefined ? 'frame.health.unreachable.tooltip' : SERVER_COVER_COPY[serverCover], { url: displayUrl(recoveryUrl) });
  const recoveryAsk = useRecoveryAsk(id);

  const [hasSettled, setHasSettled] = useState(data.health !== 'loading');
  if (!hasSettled && data.health !== 'loading') setHasSettled(true);
  const unreachable = data.health === 'unreachable';
  const [failedGuest, setFailedGuest] = useState({ unreachable, attempt, target: data.target });
  if (failedGuest.unreachable !== unreachable) setFailedGuest({ unreachable, attempt, target: data.target });
  const suspended = under.kind === 'unreachable' && (!failedGuest.unreachable || (failedGuest.attempt === attempt && failedGuest.target === data.target));
  // An arriving Frame flies without its page: a heavy load mid-flight stutters the film, so the guest mounts when it lands.
  const canMountGuest = serverCover === undefined && !discarded && !isArriving;
  const hasGuest = canMountGuest && !suspended;
  const attachUrl = useFrameAttachUrl(id, mountUrl, attempt, hasGuest, onAttachRefused);

  const currentUrl = data.currentUrl;
  const retargetFrame = useCanvasStore((state) => state.retargetFrame);
  const remountGuest = useCallback(
    (url: string, bypassCache: boolean) => {
      if (!canMountGuest) return;
      setRefresh((previous) => ({
        nonce: (previous?.nonce ?? 0) + 1,
        url,
        bypassCache,
        epoch: guestEpoch,
        discardEpoch,
      }));
    },
    [canMountGuest, guestEpoch, discardEpoch],
  );
  /** The toolbar reloads where the guest sits (ONL-2897). */
  const refreshGuest = useCallback(
    (bypassCache: boolean) => {
      remountGuest(currentUrl, bypassCache);
    },
    [remountGuest, currentUrl],
  );

  const guestInstance = `${mountNonce}:${guestEpoch}:${discardEpoch}:${attachUrl ?? ''}`;

  useFrameWebview(id, webviewRef, data.target, {
    nonce: guestInstance,
    bypassCache: refreshCurrent?.bypassCache ?? false,
    hasGuest,
  });
  const picker = useFramePicker(id, webviewRef, guestInstance, {
    x: positionAbsoluteX,
    y: positionAbsoluteY,
  });
  // Elements pick only inside the selected frame; a first click on any other frame selects it instead.
  const isExportMode = useCanvasStore((state) => state.isExportMode);
  const shown = shownOverFrame(shownFacts);
  const quote = coversOn && shown.kind === 'quote' ? shown.quote : undefined;
  const quoteZoom = useFlowStore((state) => (quote === undefined ? 1 : state.transform[2]));
  const shows = useHeldCover(frameCover(shown, { hasLoaded: hasSettled, canAsk, startedBy: startUnderWay ?? 'agent' }));
  const pickerLive = isPickerLive({ tool, mode, isExportMode }) && (selected || isFocused) && quote === undefined;
  const isScrollKeyOn = useScrollKeyStore((state) => scrollKeyOnFrame(state, id));
  const scroll = useFrameScroll(webviewRef, guestInstance,
    scrollbarEligible({ armed: isArmed, isScrollKeyOn, mode, exporting: isExportMode, hasGuest, health: data.health }));
  const moving = useCameraMotion((state) => state.moving);
  const [wasReadable, setWasReadable] = useState(true);
  const isReadable = useFlowStore((state) =>
    isFrameReadable(
      { x: positionAbsoluteX, y: positionAbsoluteY, width: width ?? 0, height: height ?? 0 },
      { width: state.width, height: state.height, transform: state.transform },
      wasReadable,
    ),
  );
  useEffect(() => { if (!moving) setWasReadable(isReadable); }, [moving, isReadable]);
  const canPause = !isReadable && !pickerLive && !hasHeldElement && !isResizing &&
    !inlineChat && !data.working && data.health === 'live';
  const pictureKey = `${mountNonce}:${guestEpoch}`;
  const thumbnail = useFrameIdle(webviewRef, canPause, guestInstance, hasGuest, pictureKey);
  // A resize does not reload, so without this the Frame wakes under a picture of its older shape (ONL-2987).
  const picturedShape = useRef<string | null>(null);
  useEffect(() => {
    const shape = `${String(width ?? 0)}x${String(height ?? 0)}`;
    if (isResizing || !hasGuest || data.health !== 'live') return;
    const previous = picturedShape.current;
    picturedShape.current = shape;
    if (previous === null || previous === shape) return;
    const guest = webviewRef.current;
    if (!guest || !studio()?.framePicture) return;
    let requested = false;
    return bindGuestReady(guest, () => {
      if (requested) return;
      requested = true;
      void studio().framePicture({ webContentsId: guest.getWebContentsId(), retake: true })
        .catch(ignoreRefusal('canvas', 'frame picture retake'));
    });
  }, [isResizing, hasGuest, data.health, width, height, guestInstance]);
  const clearHover = picker.hoverAt;
  useEffect(() => {
    if (!pickerLive) clearHover(null);
  }, [pickerLive, clearHover]);
  const pickSuppressedRef = useRef(false);

  // Click only: a hover defers these two reads into its own frame (ONL-2455).
  const guestPoint = (event: React.PointerEvent | React.MouseEvent) =>
    guestPointFrom(
      { x: event.clientX, y: event.clientY },
      event.currentTarget.getBoundingClientRect(),
      getViewport().zoom,
      readGuestZoom(webviewRef.current),
    );

  const shielded = useCanvasStore((state) => isFrameShielded(state, id));

  const nodeBoxRef = useRef<HTMLDivElement | null>(null);
  const wheelRef = useLatestRef({ scroll, isScrollKeyOn, zoom: () => getViewport().zoom });
  useEffect(() => {
    const box = nodeBoxRef.current;
    if (box === null) return;
    const enter = () => pointFrame(id, true);
    const leave = () => pointFrame(id, false);
    box.addEventListener('pointerenter', enter);
    box.addEventListener('pointerleave', leave);
    return () => {
      box.removeEventListener('pointerenter', enter);
      box.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [id]);
  useEffect(() => {
    const box = nodeBoxRef.current;
    if (!isScrollKeyOn || box === null) return;
    const onWheel = (event: WheelEvent) => {
      const { scroll: current, isScrollKeyOn: isKeyHeld, zoom: readZoom } = wheelRef.current;
      if (!(event.target instanceof Element) || event.target.closest('[data-testid="frame-shield"]') === null) return;
      const scrolled = frameWheelScroll(event, { viewport: current.metrics?.viewport ?? null, isKeyHeld, zoom: readZoom() });
      if (scrolled === null) return;
      event.preventDefault();
      event.stopPropagation();
      current.scrollBy(scrolled.delta);
      if (scrolled.movesPageByKey) noteKeyScroll();
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [isScrollKeyOn]);

  const scale = chromeScale(zoom);

  const recover = (): void => {
    const entries = useServerStore.getState().entries;
    const match = matchServerPort(entries, recoveryUrl);
    // The recovery address decides the act, not where the guest sits: its own server is what a Start could lift (ONL-2897).
    if (serverCover !== undefined || isStartableCover(frameServerCover(entries, recoveryUrl))) {
      const intent = { press: 'start' as const, ...(match === undefined ? {} : { entryIds: [match.entry.entryId] }) };
      if (reportRunIntent !== null) reportRunIntent(intent);
      else studio().serverIntent(intent);
    } else {
      retargetFrame(recoveryUrl, id);
      remountGuest(recoveryUrl, false);
    }
  };
  const onCoverAction = (action: CoverAction): void => {
    if (action === 'ask-agent') {
      if (shows.kind === 'cover' && isAskableCover(shows.cover)) recoveryAsk.ask(coverAsk(shows.cover, recoveryUrl));
      return;
    }
    studio().telemetryEvent({ event: 'preview_recovery_pressed', properties: { action } });
    if (action === 'back') retargetFrame(data.homeUrl, id);
    else recover();
  };

  // Bounds from the settled size: from the live box they ratchet mid-gesture and re-trigger the collapse they guard.
  const settledWidth = useCanvasStore((state) => state.doc?.nodes[id]?.width);
  const settledHeight = useCanvasStore((state) => state.doc?.nodes[id]?.height);
  const resizeBounds = {
    minWidth: resizeFloor(MIN_FRAME_SIZE.width, settledWidth ?? width),
    minHeight: resizeFloor(MIN_FRAME_SIZE.height, settledHeight ?? height),
    maxWidth: resizeCeiling(MAX_FRAME_SIZE.width, settledWidth ?? width),
    maxHeight: resizeCeiling(MAX_FRAME_SIZE.height, settledHeight ?? height),
  };

  const isChromeShown = useFlowStore((state) => isChromeVisible({ zoom: state.transform[2], isSelected: selected }));
  const duplicateSource = useCanvasStore((state) => {
    const drag = state.duplicateDrag;
    if (!drag || drag.isCancelled || !drag.members.has(id)) return null;
    return state.doc?.nodes[id] ?? null;
  });

  return (
    <>
      <CanvasNodeMenu
        nodeId={id}
        readZoom={() => getViewport().zoom}
      >
      {/* Sized in px: Astryx's right-click wrapper hugs its content, so a `height: 100%` child collapses inside it. */}
      <div ref={nodeBoxRef} style={{ width: width ?? '100%', height: height ?? '100%' }}>
      <VStack
        gap={0}
        width="100%"
        height="100%"
        data-testid="frame-node"
        data-frame-health={effectiveHealth}
        data-server-cover={serverCover}
        data-chrome={isChromeShown ? 'visible' : 'hidden'}
        data-arriving={isArriving || undefined}
        // The resize controls and the hanging chrome anchor to this box; the transform plants the ⌥-drag source while React Flow moves its wrapper (ONL-2128).
        style={{
          position: 'relative',
          ...(isArriving ? { opacity: 0, pointerEvents: 'none', transformOrigin: '0 0' } : {}),
          ...(duplicateSource
            ? {
                transform: `translate(${String(duplicateSource.x - positionAbsoluteX)}px, ${String(duplicateSource.y - positionAbsoluteY)}px)`,
              }
            : {}),
        }}
      >
        {/* Padding, not margin: inside the transform it holds screen size. Not `NodeToolbar`: it portals off the frame's drag surface. */}
        {isChromeShown ? (
        <VStack
          className="frame-chrome"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            width: 'calc(100% * var(--frame-zoom, 1))',
            paddingBottom: 'var(--spacing-1-5)',
            transform: 'scale(calc(1 / var(--frame-zoom, 1)))',
            transformOrigin: 'bottom left',
            ...(isArriving ? { opacity: 0 } : {}),
          }}
        >
          <FrameToolbar
            frameId={id}
            data={hasGuest && attachUrl !== undefined ? data : { ...data, canGoBack: false, canGoForward: false }}
            webviewRef={webviewRef}
            isAddressOccluded={isAddressOccluded}
            compact={isChromeCompactNow}
            isAccented={selected || isHovered || isFocused}
            hasControls={isArmed}
            onRefresh={refreshGuest}
            refreshNonce={mountNonce}
          />
        </VStack>
        ) : null}

        <Stack
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            // `white`, not a token, and only once live: a guest paints transparent where a page sets no background, and white before paint claims a page loaded.
            background:
              effectiveHealth === 'live' ? 'white' : 'var(--color-background-card)',
          }}
        >
          {serverCover !== undefined ? (
            /* No guest mounts under a cover: a `<webview>` keeps its last paint when its server dies, and aimed elsewhere it paints an error page or a stranger's app. */
            <Center style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} data-testid="frame-server-cover">
              {!coversOn && !older.recoverable && !older.isStarting && <Text justify="center" style={coverTextStyle(scale, 'var(--color-border)')}>
                {t(SERVER_COVER_COPY[serverCover], { url: displayUrl(data.currentUrl) })}
              </Text>}
            </Center>
          ) : hasGuest && attachUrl !== undefined && (
            /* `src` changes only with the `key`, so a re-render never reloads the user's app; navigation goes through the element's API. */
            <webview
              key={`guest-${guestInstance}`}
              id={`frame-page-${id}`}
              ref={webviewRef}
              src={attachUrl}
              // Shared: a login in one frame holds in every frame of the same app.
              partition="persist:studio-frames"
              className="nodrag nopan nowheel"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                // The guest's own surface has Chromium's white base; transparent while loading so the label behind shows.
                backgroundColor:
                  data.health === 'loading' ? 'transparent' : 'var(--color-background-card)',
              }}
              data-testid="frame-webview"
            />
          )}

          {serverCover === undefined && !isDead && (
            <FrameIdleThumbnail key={pictureKey} thumbnail={thumbnail} />
          )}

          {!coversOn && (older.isStarting || (serverCover === undefined && data.health === 'loading' && thumbnail === null)) && <FrameLoadingLabel scale={scale} />}

          {shielded && (
            <Stack
              vAlign="end"
              hAlign="center"
              padding={2}
              data-testid="frame-shield"
              data-shield={
                isResizing
                  ? 'resize'
                  : tool === 'pan'
                    ? 'pan'
                    : isSpacePanning
                      ? 'space'
                      : isPicking
                        ? 'picking'
                        : pickerLive
                          ? 'live'
                          : 'rest'
              }
              /* Neither handler cancels anything, so drag and pan pass through. */
              onPointerMove={
                pickerLive
                  ? (event) => {
                      // The ⌥-drag registers at React Flow's drag start, after the press.
                      if (isGestureInFlight()) pickSuppressedRef.current = true;
                      // The shield element, not the point: a raw sample costs this handler nothing (ONL-2455).
                      picker.hoverAt({
                        client: { x: event.clientX, y: event.clientY },
                        shield: event.currentTarget,
                      });
                    }
                  : undefined
              }
              onPointerLeave={pickerLive ? () => picker.hoverAt(null) : undefined}
              // Also the reset: a gesture released elsewhere left no click here to clear the mark.
              onPointerDown={
                pickerLive
                  ? () => {
                      pickSuppressedRef.current = isGestureInFlight();
                    }
                  : undefined
              }
              onClick={
                pickerLive
                  ? (event) => {
                      const suppressed = pickSuppressedRef.current || isGestureInFlight();
                      pickSuppressedRef.current = false;
                      // No `stopPropagation`: a suppressed release's click belongs to the gesture.
                      if (suppressed) return;
                      // Without the stop the pick would also reach React Flow and select the frame.
                      event.stopPropagation();
                      // The shield cancels the press, so a field elsewhere would keep focus and swallow Enter and Escape; the armed composer keeps it, since the pick lands there.
                      if (!isPicking) releaseFieldFocus();
                      picker.pickAt(guestPoint(event), event.shiftKey);
                      if (event.detail >= 2 && !event.shiftKey) expandInlineChat();
                    }
                  : undefined
              }
              // No `nopan`: pans over a frame land here, and the class makes React Flow's zoom filter reject them (ONL-1864).
              // The crosshair marks the armed composer only; the outline is the live picker's cue.
              style={{
                position: 'absolute',
                inset: 0,
                ...(isPicking ? { cursor: 'crosshair' } : {}),
              }}
            >
            </Stack>
          )}

          <FrameQuote quote={quote} isBuilding={data.working === true} width={width ?? DEFAULT_FRAME_SIZE.width} height={height ?? DEFAULT_FRAME_SIZE.height} canvasZoom={quoteZoom} />

          {coversOn && shows.kind === 'cover' && (
            <div className="frame-scale-in" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: (width ?? DEFAULT_FRAME_SIZE.width) * zoom, height: (height ?? DEFAULT_FRAME_SIZE.height) * zoom, transform: `scale(${String(scale)})`, transformOrigin: '0 0' }}>
                <FrameCover
                  cover={shows.cover}
                  actions={shows.actions}
                  width={(width ?? DEFAULT_FRAME_SIZE.width) * zoom}
                  height={(height ?? DEFAULT_FRAME_SIZE.height) * zoom}
                  url={recoveryUrl}
                  homeUrl={data.homeUrl}
                  failure={data.loadFailure}
                  isAsking={recoveryAsk.sending}
                  askFailed={recoveryAsk.failed}
                  onAction={onCoverAction}
                />
              </div>
            </div>
          )}

          {!coversOn && older.namedFailure !== undefined && (
            <FrameLoadFailedCover
              failure={older.namedFailure}
              homeUrl={data.homeUrl}
              onBack={() => retargetFrame(data.homeUrl, id)}
              scale={scale}
            />
          )}
          {!coversOn && older.recoverable && (
            <FrameRecovery
              key={recoveryUrl}
              frameId={id}
              url={recoveryUrl}
              detail={recoveryDetail}
              scale={scale}
              onRestart={recover}
            />
          )}
        </Stack>

        {/* After the guest and positioned, so the ring paints above the webview's native surface. */}
        <FrameRing isEmphasised={selected || isHovered || isFocused} />

        {/* Keyed on armed, not selected: a second frame's edge lines would swallow canvas gestures. */}
        {isArmed && (
          <NodeResizeHandles
            id={id}
            testId="frame-resize-handle"
            scale={scale}
            bounds={resizeBounds}
          />
        )}

        {scroll.metrics !== null && (
          <FrameScrollbar metrics={scroll.metrics} scrollTo={scroll.scrollTo} scale={scale} height={height ?? 0} controls={`frame-page-${id}`} />
        )}

      </VStack>
      </div>
      </CanvasNodeMenu>

      {/* Portaled: the node box clips, and the anchor is the guest's box. */}
      {inlinePresence !== null ? (
        <ViewportPortal>
          <InlineElementChat
            record={inlinePresence.record}
            exit={inlinePresence.exit}
            box={anchorFlowBox({
              rect: inlinePresence.rect,
              guestZoom: inlinePresence.record.anchor === 'node' ? 1 : readGuestZoom(webviewRef.current),
              origin: { x: positionAbsoluteX, y: positionAbsoluteY },
            })}
            frame={{ x: positionAbsoluteX, width: width ?? 0 }}
          />
        </ViewportPortal>
      ) : null}
    </>
  );
}

/** Drawn above the shield so Back works in Design too; only the button takes the pointer (ONL-2336). */
export function FrameLoadFailedCover({
  failure,
  homeUrl,
  onBack,
  scale = 1,
}: {
  failure: FrameLoadFailure;
  homeUrl: string;
  onBack: () => void;
  scale?: number;
}): React.JSX.Element {
  const copy = loadFailureCopy(failure, homeUrl);
  return (
    <div
      className="frame-failure-cover"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
      data-testid="frame-load-failed"
    >
      {/* Sized in screen px, so the container queries in `styles.css` shed detail as the frame shrinks on screen. */}
      <div
        className="frame-failure"
        style={{
          width: `${String(100 / scale)}%`,
          height: `${String(100 / scale)}%`,
          transform: `scale(${String(scale)})`,
        }}
      >
        <VStack gap={2} align="center" className="frame-failure-card">
          <span className="frame-failure-glyph">
            <Icon icon={WindowGlyph} />
          </span>
          <Text type="label" justify="center" className="frame-failure-title">
            {t('frame.health.failed.title')}
          </Text>
          <Text type="supporting" color="secondary" justify="center" className="frame-failure-detail">
            {t(copy.key, copy.params)}
          </Text>
          {/* The press is Back and nothing else — without the stop it would also select the frame. */}
          <Stack
            className="frame-failure-action nodrag nopan"
            style={{ pointerEvents: 'auto' }}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="secondary"
              label={t('frame.health.failed.back', { home: displayUrl(homeUrl) })}
              onClick={onBack}
            />
          </Stack>
        </VStack>
      </div>
    </div>
  );
}

function coverTextStyle(scale: number, color: string): React.CSSProperties {
  return { color, maxWidth: `${String(80 / scale)}%`, transform: `scale(${String(scale)})` };
}

const SERVER_COVER_COPY: Record<FrameServerCover, StringKey> = {
  'non-started': 'frame.cover.nonStarted',
  dead: 'frame.cover.dead',
  'users-own': 'frame.cover.usersOwn',
  occupied: 'frame.cover.occupied',
  container: 'frame.cover.container',
};


export function FrameLoadingLabel({ scale = 1 }: { scale?: number }): React.JSX.Element {
  return (
    <Center
      role="status"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: 'var(--color-background-card)' }}
      data-testid="frame-loading"
    >
      <div className="frame-failure" style={{ width: `${String(100 / scale)}%`, height: `${String(100 / scale)}%`, transform: `scale(${String(scale)})` }}>
        <VStack gap={3} align="center" className="frame-failure-card">
          <span className="frame-loading-glyph" aria-hidden="true"><GlyphLoadingCircle size={20} /></span>
          <Text type="label" color="secondary" justify="center" className="frame-failure-title">{t('frame.health.loading.label')}</Text>
        </VStack>
      </div>
    </Center>
  );
}

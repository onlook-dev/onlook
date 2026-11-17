// ⚠️ Every effect here is keyed on the mount nonce (see `useFrameWebview`): a
// refresh destroys the WebContents, so a listener bound to the old one is bound
// to nothing and guest state must be re-asserted.

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useReactFlow, useStoreApi } from '@xyflow/react';
import { useLatestRef } from '../../useLatestRef.js';
import { useCameraControls } from '../camera.js';
import {
  GUEST_CHANNEL_TO_GUEST,
  GUEST_CHANNEL_TO_HOST,
  seedOf,
  type PickerToGuest,
} from '@studio/events';
import { ignoreRefusal } from '../../refusal.js';
import { useSettingsStore } from '../../settings/store.js';
import { useCanvasStore } from '../store.js';
import {
  isDiagnosticsOpen,
  noteGuestHover,
  noteHoverSend,
  registerFramePicker,
} from '../../diagnostics/registry.js';
import { isAnchorLocked } from '../inlinePlacement.js';
import { seedableSelectionsForFrame, selectionsForFrame } from '../selection.js';
import { escapeInlineChat, refuseGather } from '../useInlineElementChat.js';
import { admitPickerMessage, nextPickerGeneration } from './pickerMessages.js';
import {
  frameLocalFromGuest,
  guestPointFrom,
  isPickerLive,
  isPickSuppressed,
  readGuestZoom,
  zoomAboutCanvasPoint,
} from './geometry.js';
import { createHoverCoalescer } from './hoverCoalesce.js';
import { bindGuestReady } from './guestReady.js';
import { scheduleSettledZoom } from './settledZoom.js';
import { ZOOM_BOUNDS } from '../model.js';
import { studio } from '../../bridge.js';

interface GuestElement extends HTMLElement {
  send(channel: string, ...args: unknown[]): void;
  getZoomFactor(): number;
  getWebContentsId(): number;
}

let latestPickerGeneration = 0;

function allocatePickerGeneration(): number {
  latestPickerGeneration = nextPickerGeneration(latestPickerGeneration);
  return latestPickerGeneration;
}

function armStateMessage(armed: boolean, generation: number): PickerToGuest {
  return armed ? { type: 'arm', generation } : { type: 'disarm', generation };
}

/** Read at event time, not from a render's props: a gesture starts and clears between them (ONL-2455). */
export function isGestureInFlight(): boolean {
  const state = useCanvasStore.getState();
  return isPickSuppressed({
    // Any frame's resize, not this one's: a drag can end over a neighbour.
    isResizing: state.resizeInFlightId !== null,
    tool: state.tool,
    isSpacePanning: state.isSpacePanning,
    isDrawingFrame: state.frameDraw !== null,
    isDuplicateDragging: state.duplicateDrag !== null,
  });
}

export function useFramePicker(
  frameId: string,
  ref: RefObject<Electron.WebviewTag | null>,
  mountNonce: number | string,
  /** This frame's absolute canvas position, not a frame-local offset. */
  origin: { x: number; y: number },
): FramePicker {
  const { getViewport, setViewport } = useReactFlow();
  const flowStore = useStoreApi();
  // The same camera the host-side ⇧ chords drive (ONL-1979); a second
  // implementation of it is how "fit" stops meaning one framing.
  const camera = useCameraControls();
  const isLive = useCanvasStore(isPickerLive);
  /** Interact hides the outlines and keeps the selection. */
  const areOutlinesVisible = useCanvasStore((state) => state.mode === 'design');
  const addElementSelection = useCanvasStore((state) => state.addElementSelection);
  const removeElementSelection = useCanvasStore((state) => state.removeElementSelection);
  const setElementStale = useCanvasStore((state) => state.setElementStale);
  const refreshElementSelection = useCanvasStore((state) => state.refreshElementSelection);
  const setElementAnchorRect = useCanvasStore((state) => state.setElementAnchorRect);
  const activeGeneration = useRef(0);
  const selectionGenerations = useRef(new Map<string, number>());
  /** Advanced by every load, so a map answered for the page before this one is dropped. */
  const loadEpoch = useRef(0);
  /** Only to key the read on main's lane; the guest decides WHEN a re-read is worth asking for. */
  const mapReads = useRef(0);
  // Read at event time, never a listener dep: `zoom` or `origin` in an effect's
  // deps rebinds the listener on every wheel tick.
  const readZoom = useCallback(() => getViewport().zoom, [getViewport]);
  const originRef = useLatestRef(origin);
  const cameraRef = useLatestRef(camera);
  // One cast for the whole hook: `WebviewTag.send` is typed `Promise<void>`, the guest's is `void`.
  const guestRef = ref as unknown as RefObject<GuestElement | null>;

  const readComponentMap = useCallback(
    (epoch: number): void => {
      const docId = useCanvasStore.getState().doc?.docId;
      if (docId === undefined) return;
      mapReads.current += 1;
      // The read's own key on main's lane, and the load it belongs to.
      const loadToken = `${String(epoch)}:${String(mapReads.current)}`;
      void studio()
        .codeComponentMap({ docId, frameId, loadToken })
        .then((answer) => {
          if (!answer.ok || loadEpoch.current !== epoch) return;
          guestRef.current?.send(GUEST_CHANNEL_TO_GUEST, {
            type: 'componentMap',
            paths: answer.boundaries.map((boundary) => boundary.domPath),
            generation: activeGeneration.current,
          } satisfies PickerToGuest);
        })
        .catch(ignoreRefusal('canvas', 'component map'));
    },
    [guestRef, frameId],
  );

  /**
   * Re-asserts this frame's whole guest state: boxes, the anchor the surface
   * follows, the arm, the suppression, the zoom. The seed rides its own
   * generation and the arm advances past it, in that order (ONL-2455).
   */
  const reseedGuest = useCallback((): void => {
    const element = guestRef.current;
    if (!element) return;
    const state = useCanvasStore.getState();
    const seeds = seedableSelectionsForFrame(
      state.elementSelections,
      frameId,
      state.overlay[frameId]?.currentUrl,
    ).map((s) => seedOf(s.evidence));
    const seedGeneration = allocatePickerGeneration();
    selectionGenerations.current = new Map(
      seeds.map((selection) => [selection.id, seedGeneration]),
    );
    const seed: PickerToGuest = {
      type: 'seedSelections',
      selections: seeds,
      anchorId: state.inlineChat?.anchorId ?? null,
      generation: seedGeneration,
    };
    const armGeneration = allocatePickerGeneration();
    activeGeneration.current = armGeneration;
    try {
      element.send(GUEST_CHANNEL_TO_GUEST, seed);
      element.send(GUEST_CHANNEL_TO_GUEST, armStateMessage(isPickerLive(state), armGeneration));
      // A fresh document's preload starts visible, and the visibility effect
      // fires only on a CHANGE — without this a reload in Interact paints outlines.
      element.send(GUEST_CHANNEL_TO_GUEST, {
        type: 'outlineVisibility',
        visible: state.mode === 'design',
        generation: armGeneration,
      } satisfies PickerToGuest);
      // A fresh document starts at scale 1, and the zoom effect only fires on a
      // CHANGE — without this a reload while zoomed out paints hairlines until
      // the user touches the wheel.
      element.send(GUEST_CHANNEL_TO_GUEST, {
        type: 'zoom',
        zoom: readZoom(),
        generation: armGeneration,
      } satisfies PickerToGuest);
      // Never sent on a shipped build, where the gate cannot open: the guest's
      // default is off, so it reports no hover and builds no path (ONL-2455).
      if (isDiagnosticsOpen()) {
        element.send(GUEST_CHANNEL_TO_GUEST, {
          type: 'hoverReports',
          enabled: true,
          generation: armGeneration,
        } satisfies PickerToGuest);
      }
    } catch {
      // A guest that went away between the event and this call.
    }

    loadEpoch.current += 1;
    readComponentMap(loadEpoch.current);
  }, [guestRef, frameId, readZoom, readComponentMap]);

  useEffect(() => {
    const element = guestRef.current;
    if (!element) return;

    const onMessage = (event: Event): void => {
      const { channel, args } = event as Event & { channel: string; args: unknown[] };
      if (channel !== GUEST_CHANNEL_TO_HOST) return;
      const state = useCanvasStore.getState();
      const message = admitPickerMessage(args, {
        ownsWebview: event.currentTarget === ref.current,
        pickerLive: isPickerLive(state),
        activeGeneration: activeGeneration.current,
        selectionGenerations: selectionGenerations.current,
      });
      if (!message) return;
      switch (message.type) {
        case 'picked': {
          if (!message.shiftHeld) selectionGenerations.current.clear();
          const outcome = addElementSelection(message.evidence, frameId, message.shiftHeld);
          if (outcome === 'added') {
            selectionGenerations.current.set(message.evidence.id, message.generation);
            void useSettingsStore.getState().dismissTipsPill('selection').catch(ignoreRefusal('canvas', 'tips pill dismissal'));
            break;
          }
          // The cap the guest relayed rather than swallowed, and anything else
          // the pure add turned away: whichever surface is up says so (ONL-2482).
          if (outcome !== 'already-held') refuseGather(outcome);
          const generation = allocatePickerGeneration();
          activeGeneration.current = generation;
          try {
            element.send(GUEST_CHANNEL_TO_GUEST, {
              type: 'removeSelection',
              id: message.evidence.id,
              generation,
            } satisfies PickerToGuest);
          } catch {
            // Guest gone between the pick and this reply.
          }
          break;
        }
        case 'refreshed':
          refreshElementSelection(message.evidence);
          break;
        case 'anchorGeometry':
          setElementAnchorRect(message.id, message.rect);
          break;
        case 'deselected':
          // The guest drops its box before it asks, so the refused removal of an
          // anchor is repaired here rather than left erased (ONL-2455).
          if (isAnchorLocked(state.inlineChat, message.id)) {
            reseedGuest();
            break;
          }
          selectionGenerations.current.delete(message.id);
          removeElementSelection(message.id);
          break;
        case 'staleness':
          setElementStale(message.id, message.stale);
          break;
        case 'hovered':
          noteGuestHover({
            frameId,
            tag: message.tag,
            domPath: message.domPath,
            hitTests: message.hitTests,
          });
          break;
        case 'wheel': {
          // The guest reports in ITS client px; the frame's origin plus the
          // guest's page zoom places the anchor on the canvas (ONL-1989).
          const viewport = getViewport();
          const local = frameLocalFromGuest(
            { x: message.clientX, y: message.clientY },
            readGuestZoom(element),
          );
          setViewport(
            zoomAboutCanvasPoint(
              viewport,
              { x: originRef.current.x + local.x, y: originRef.current.y + local.y },
              message.deltaY,
              message.isPinch,
              ZOOM_BOUNDS,
            ),
          );
          break;
        }
        case 'context-menu': {
          const rect = element.getBoundingClientRect();
          const local = frameLocalFromGuest(
            { x: message.clientX, y: message.clientY },
            readGuestZoom(element),
          );
          const scale = readZoom();
          element.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: rect.left + local.x * scale,
              clientY: rect.top + local.y * scale,
              detail: 1,
            }),
          );
          break;
        }
        case 'zoom-chord': {
          // Host-focused ⇧ chords take the registry path in `Canvas.tsx`
          // instead; focus is singular, so exactly one of the two fires.
          const move = cameraRef.current;
          if (message.action === 'in') move.zoomIn();
          else if (message.action === 'out') move.zoomOut();
          else if (message.action === 'reset') move.zoomActual();
          else if (message.action === 'fit') move.fitAll();
          else move.fitSelection();
          break;
        }
        case 'space-pan':
          useCanvasStore.getState().relaySpacePan(frameId, message.held);
          break;
        case 'error':
          // Our code inside the frame threw. Main re-scrubs at its door.
          studio().telemetryException({ ...message.report, surface: 'frame-preload', mechanism: 'guest-handler' });
          break;
        case 'dom-settled':
          readComponentMap(loadEpoch.current);
          break;
        case 'escape':
          // The redundant path: the primary Escape handler is window-level,
          // because focus sits host-side. The guest relays this from below its
          // `isTrusted` return (ONL-2455) — it destroys what the user
          // gathered, not a toggle.
          escapeInlineChat();
          break;
      }
    };

    element.addEventListener('ipc-message', onMessage);
    return () => element.removeEventListener('ipc-message', onMessage);
  }, [
    ref,
    frameId,
    mountNonce,
    addElementSelection,
    removeElementSelection,
    setElementStale,
    refreshElementSelection,
    setElementAnchorRect,
    originRef,
    readZoom,
    reseedGuest,
    readComponentMap,
  ]);

  useEffect(() => {
    const element = guestRef.current;
    if (!element) return;
    const generation = allocatePickerGeneration();
    activeGeneration.current = generation;
    try {
      element.send(GUEST_CHANNEL_TO_GUEST, armStateMessage(isLive, generation));
    } catch {
      // Not attached yet.
    }
  }, [ref, isLive, mountNonce]);

  // Sent at the CURRENT generation, like `zoom`: a fresh one would invalidate
  // the arm in force. Suppression, never `clearSelections` — the guest's `held`
  // map is what a Design → Interact → Design round trip has to survive.
  useEffect(() => {
    const element = guestRef.current;
    if (!element) return;
    try {
      element.send(GUEST_CHANNEL_TO_GUEST, {
        type: 'outlineVisibility',
        visible: areOutlinesVisible,
        generation: activeGeneration.current,
      } satisfies PickerToGuest);
    } catch {
      // Not attached yet.
    }
  }, [ref, areOutlinesVisible, mountNonce]);

  // Not gated on `isLive`: a selected element keeps its outline where the
  // picker is not. Sent at the CURRENT generation — allocating a fresh one
  // here would invalidate the arm that is in force.
  useEffect(() => {
    let cancel: (() => void) | undefined;
    const schedule = (): void => {
      cancel?.();
      cancel = scheduleSettledZoom(() => {
        const element = guestRef.current;
        if (!element) return;
        try {
          element.send(GUEST_CHANNEL_TO_GUEST, {
            type: 'zoom', zoom: readZoom(), generation: activeGeneration.current,
          } satisfies PickerToGuest);
        } catch { return; }
      });
    };
    schedule();
    const unsubscribe = flowStore.subscribe((state, previous) => {
      if (state.transform[2] !== previous.transform[2]) schedule();
    });
    return () => { cancel?.(); unsubscribe(); };
  }, [guestRef, flowStore, readZoom, mountNonce]);

  // ⌥ is read from the window, not the pointer: holding it still must show the measurement without a move.
  useEffect(() => {
    if (!isLive) return undefined;
    const post = (active: boolean): void => {
      try {
        guestRef.current?.send(GUEST_CHANNEL_TO_GUEST, {
          type: 'measure',
          active,
          generation: activeGeneration.current,
        } satisfies PickerToGuest);
      } catch {
        // Not attached yet.
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Alt') post(event.type === 'keydown');
    };
    const onBlur = (): void => post(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
      post(false);
    };
  }, [ref, isLive, mountNonce]);

  // Re-seed on `dom-ready`: a navigation or refresh resets the guest, so its
  // outlines are gone while the selections are still attached to the prompt.
  // A hold the old document relayed is released, never re-asserted: its `keyup` left with it (ONL-2577).
  useEffect(() => {
    const element = guestRef.current;
    if (!element) return;
    const release = (): void => {
      useCanvasStore.getState().releaseSpacePanFrom(frameId);
    };
    const onDomReady = (): void => {
      release();
      reseedGuest();
    };
    // `did-navigate` commits before `dom-ready` and carries a replacement that never paints;
    // `destroyed` carries a guest a cover unmounted, which fires no navigation at all.
    const stopReady = bindGuestReady(element, onDomReady);
    element.addEventListener('did-navigate', release);
    element.addEventListener('render-process-gone', release);
    element.addEventListener('destroyed', release);
    return () => {
      stopReady();
      element.removeEventListener('did-navigate', release);
      element.removeEventListener('render-process-gone', release);
      element.removeEventListener('destroyed', release);
      release();
    };
  }, [guestRef, frameId, mountNonce, reseedGuest]);

  useEffect(() => {
    return useCanvasStore.subscribe((state, prev) => {
      if (state.elementSelections === prev.elementSelections) return;
      const element = guestRef.current;
      if (!element) return;
      const now = new Set(
        selectionsForFrame(state.elementSelections, frameId).map((s) => s.evidence.id),
      );
      const before = selectionsForFrame(prev.elementSelections, frameId);
      const dropped = before.filter((s) => !now.has(s.evidence.id));
      if (dropped.length === 0) return;
      for (const selection of dropped) {
        selectionGenerations.current.delete(selection.evidence.id);
      }
      const generation = allocatePickerGeneration();
      activeGeneration.current = generation;
      try {
        if (now.size === 0) {
          element.send(GUEST_CHANNEL_TO_GUEST, {
            type: 'clearSelections',
            generation,
          } satisfies PickerToGuest);
        } else {
          for (const selection of dropped) {
            element.send(GUEST_CHANNEL_TO_GUEST, {
              type: 'removeSelection',
              id: selection.evidence.id,
              generation,
            } satisfies PickerToGuest);
          }
        }
      } catch {
        // Guest gone before the re-seed landed.
      }
    });
  }, [ref, frameId]);

  // Sent at the CURRENT generation, so a relay from a disarmed session is
  // dropped by the guest.
  const sendPoint = useCallback(
    (message: PickerToGuest): void => {
      const element = guestRef.current;
      if (!element) return;
      try {
        element.send(GUEST_CHANNEL_TO_GUEST, message);
      } catch {
        // Guest gone between the gesture and this call.
      }
    },
    [ref],
  );

  /** One conversion and one send per animation frame, and neither mid-gesture — where the activation stays live (ONL-2455). */
  const hoverRelay = useMemo(
    () =>
      createHoverCoalescer<HoverSample | null, { x: number; y: number } | null>({
        // The reflow and the guest's zoom — a synchronous call into main — are
        // the frame's cost, never the pointer move's (ONL-2455).
        convert: (sample) =>
          sample === null
            ? null
            : guestPointFrom(
                sample.client,
                sample.shield.getBoundingClientRect(),
                readZoom(),
                readGuestZoom(guestRef.current),
              ),
        send: (point) => {
          sendPoint({ type: 'hoverAt', point, generation: activeGeneration.current });
          noteHoverSend();
        },
        schedule: (flush) => {
          requestAnimationFrame(flush);
        },
        isSuspended: isGestureInFlight,
        isClear: (sample) => sample === null,
      }),
    [sendPoint, guestRef, readZoom],
  );

  // A pending point outlives neither the frame nor the picker going quiet.
  useEffect(() => {
    if (!isLive) hoverRelay.clear();
    return () => {
      hoverRelay.clear();
    };
  }, [hoverRelay, isLive]);

  const hoverAt = useCallback(
    (sample: HoverSample | null): void => {
      hoverRelay.post(sample);
    },
    [hoverRelay],
  );

  const pickAt = useCallback(
    (point: { x: number; y: number }, shiftHeld: boolean): void => {
      sendPoint({ type: 'pickAt', point, shiftHeld, generation: activeGeneration.current });
    },
    [sendPoint],
  );

  /**
   * The diagnostics gate's pick (ONL-2372). Sent from here, at the SAME generation as
   * a pointer pick, because the returning `picked` is admitted against
   * `activeGeneration` — a sender of its own would allocate one this hook never
   * hears about, and the pick would come back and be dropped.
   */
  const pickPath = useCallback(
    (selector: string, shiftHeld: boolean): void => {
      sendPoint({ type: 'pickPath', selector, shiftHeld, generation: activeGeneration.current });
    },
    [sendPoint],
  );

  // `isArmed` is what the GUEST was told, which is the live picker now.
  useEffect(
    () => registerFramePicker(frameId, { isArmed: isLive, pick: pickPath }),
    [frameId, isLive, pickPath],
  );

  return { hoverAt, pickAt };
}

/** What the guest point is derived FROM, held until the frame's flush derives it (ONL-2455). */
interface HoverSample {
  /** Host client px. */
  client: { x: number; y: number };
  /** The shield the pointer is over — the element, never the event, which does not survive its handler. */
  shield: { getBoundingClientRect(): { left: number; top: number } };
}

export interface FramePicker {
  /** `null` clears the outline, and a clear outlives a gesture where a sample does not. */
  hoverAt: (sample: HoverSample | null) => void;
  /** Guest-client point. */
  pickAt: (point: { x: number; y: number }, shiftHeld: boolean) => void;
}

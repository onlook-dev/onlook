import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@xyflow/react';
import { usePanelCover } from '../panelCover.js';
import { useLatestRef } from '../../useLatestRef.js';
import { followStyle, type CanvasView, type FollowAnchor } from './follow.js';

const forwarded = (event: WheelEvent): WheelEvent =>
  new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: event.clientX,
    clientY: event.clientY,
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    deltaMode: event.deltaMode,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
  });

/** Once `isAnchored`, carries its children with the canvas camera and hands a wheel over them to the canvas; `isHeld` keeps them where they are on screen while the camera moves. */
export function FollowsCanvas({ isAnchored, isHeld = false, children }: { isAnchored: boolean; isHeld?: boolean; children: ReactNode }): React.JSX.Element {
  const [x, y, zoom] = useStore((state) => state.transform);
  const domNode = useStore((state) => state.domNode);
  const cover = usePanelCover();
  const layer = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<FollowAnchor | null>(null);
  const [heldView, setHeldView] = useState<CanvasView | null>(null);
  const opening = useLatestRef({ x, y, zoom, start: cover.start });

  useLayoutEffect(() => {
    if (!isAnchored) {
      setAnchor(null);
      return;
    }
    const span = layer.current?.offsetParent;
    const { start, ...view } = opening.current;
    setAnchor({ view, start, width: span?.clientWidth ?? 0, height: span?.clientHeight ?? 0 });
  }, [isAnchored]);

  useLayoutEffect(() => {
    if (!isHeld) {
      setHeldView(null);
      return;
    }
    const now = opening.current;
    setHeldView({ x: now.x, y: now.y, zoom: now.zoom });
  }, [isHeld]);

  useEffect(() => {
    const el = layer.current;
    const pane = domNode?.querySelector('.react-flow__renderer');
    if (anchor === null || !el || !pane) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      pane.dispatchEvent(forwarded(event));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [anchor, domNode]);

  return (
    <div ref={layer} data-follows-canvas={anchor !== null || undefined} style={{ ...followStyle(anchor, heldView ?? { x, y, zoom }, cover.start), pointerEvents: 'none' }}>
      {children}
    </div>
  );
}

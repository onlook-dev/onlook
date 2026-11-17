import { useCallback, useEffect, useRef, useState } from 'react';
import type { FrameScrollMethod, FrameScrollMetrics } from '@studio/events';
import { t } from '@studio/i18n';
import { useLatestRef } from '../../useLatestRef.js';
import { telemetryProjectFields } from '../../workspace/store.js';
import { sendTelemetry } from '../telemetry.js';
import { clamp, scrollbarGeometry } from './scrollbarGeometry.js';
import './frame.css';

function reportScroll(method: FrameScrollMethod): void {
  sendTelemetry({ event: 'frame_scrolled', properties: { ...telemetryProjectFields(), method } });
}

export function FrameScrollbar({ metrics, scrollTo, scale, height, controls }: {
  metrics: FrameScrollMetrics;
  scrollTo: (top: number) => void;
  scale: number;
  height: number;
  controls: string;
}): React.JSX.Element {
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointer: number; y: number; top: number; surface: number; element: HTMLElement; moved: boolean } | null>(null);
  const track = height / scale;
  const geometry = scrollbarGeometry(metrics, track);
  const latest = useLatestRef({ metrics, geometry, scrollTo });
  const finish = useCallback(() => {
    const held = drag.current;
    drag.current = null;
    if (held !== null && held.element.hasPointerCapture(held.pointer)) held.element.releasePointerCapture(held.pointer);
    setDragging(false);
  }, []);
  useEffect(() => finish, [finish]);
  useEffect(() => { finish(); }, [metrics.surface, metrics.session, finish]);

  return (
    <div
      className="frame-scrollbar nodrag nopan"
      data-testid="frame-scrollbar"
      data-dragging={dragging ? 'true' : 'false'}
      style={{ position: 'absolute', top: 0, left: '100%', height: track,
        transform: `scale(${String(scale)})`, transformOrigin: 'top left' }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.preventDefault();
        const localY = event.clientY - event.currentTarget.getBoundingClientRect().top;
        if (localY >= geometry.top && localY <= geometry.top + geometry.thumb) return;
        const page = clamp(metrics.top + (localY < geometry.top ? -1 : 1) * metrics.viewport * 0.9, geometry.range);
        if (page === metrics.top) return;
        scrollTo(page);
        reportScroll('page');
      }}
    >
      <div
        className="frame-scrollbar-thumb-hit"
        data-testid="frame-scrollbar-thumb"
        data-dragging={dragging ? 'true' : 'false'}
        role="scrollbar"
        aria-label={t('frame.scrollbar.label')}
        aria-orientation="vertical"
        aria-controls={controls}
        aria-valuemin={0}
        aria-valuemax={geometry.range}
        aria-valuenow={Math.round(metrics.top)}
        tabIndex={0}
        style={{ height: geometry.thumb + 8, top: geometry.top - 4 }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus({ preventScroll: true });
          drag.current = { pointer: event.pointerId, y: event.clientY, top: metrics.top, surface: metrics.surface, element: event.currentTarget, moved: false };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const held = drag.current;
          if (held === null || held.pointer !== event.pointerId) return;
          const now = latest.current;
          if (held.surface !== now.metrics.surface || now.geometry.travel === 0) return;
          const top = Math.max(0, Math.min(now.geometry.range, held.top + (event.clientY - held.y) * now.geometry.range / now.geometry.travel));
          held.y = event.clientY;
          if (top === held.top) return;
          held.top = top;
          now.scrollTo(held.top);
          if (!held.moved) {
            held.moved = true;
            reportScroll('drag');
          }
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onKeyDown={(event) => {
          const destinations: Record<string, number> = {
            ArrowDown: metrics.top + 40, ArrowUp: metrics.top - 40,
            PageDown: metrics.top + metrics.viewport * 0.9, PageUp: metrics.top - metrics.viewport * 0.9,
            Home: 0, End: geometry.range,
          };
          const top = destinations[event.key];
          if (top === undefined) return;
          event.preventDefault();
          event.stopPropagation();
          const next = clamp(top, geometry.range);
          if (next === metrics.top) return;
          scrollTo(next);
          if (!event.repeat) reportScroll('key');
        }}
      >
        <div className="frame-scrollbar-pill" />
      </div>
    </div>
  );
}

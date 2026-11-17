import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { IpcMessageEvent, WebviewTag } from 'electron';
import {
  FRAME_SCROLL_CHANNEL,
  parseFrameScrollReport,
  type FrameScrollCommand,
  type FrameScrollMetrics,
} from '@studio/events';
import { bindGuestReady } from './guestReady.js';

let nextSession = 0;

export function useFrameScroll(ref: RefObject<WebviewTag | null>, instance: string, enabled: boolean): {
  metrics: FrameScrollMetrics | null;
  scrollTo: (top: number) => void;
  scrollBy: (delta: number) => void;
} {
  const [metrics, setMetrics] = useState<FrameScrollMetrics | null>(null);
  const current = useRef<FrameScrollMetrics | null>(null);
  const send = useRef<((top: number) => void) | null>(null);
  const nudge = useRef<((delta: number) => void) | null>(null);

  useEffect(() => {
    setMetrics(null);
    current.current = null;
    const guest = ref.current;
    if (!enabled || guest === null) return;
    let session = 0;
    let frame: number | null = null;
    let pending: { top: number } | { delta: number } | null = null;
    const post = (command: FrameScrollCommand) => {
      try {
        void guest.send(FRAME_SCROLL_CHANNEL, command).catch(() => {
          if (session !== command.session) return;
          current.current = null;
          setMetrics(null);
        });
      } catch {
        current.current = null;
        setMetrics(null);
      }
    };
    const reset = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      pending = null;
      session = 0;
      current.current = null;
      setMetrics(null);
    };
    const ready = () => {
      reset();
      session = ++nextSession;
      post({ type: 'observe', session, enabled: true });
    };
    const onMessage = (event: IpcMessageEvent) => {
      if (event.channel !== FRAME_SCROLL_CHANNEL || event.target !== guest || event.args.length !== 1) return;
      const report = parseFrameScrollReport(event.args[0]);
      if (report === null || report.session !== session) return;
      current.current = report.metrics;
      setMetrics(report.metrics);
    };
    const queue = (next: { top: number } | { delta: number }) => {
      pending = next;
      if (frame !== null || current.current === null) return;
      const surface = current.current.surface;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const command = pending;
        pending = null;
        if (command === null || current.current?.surface !== surface) return;
        if ('top' in command) post({ type: 'scroll', session, surface, top: command.top });
        else if (command.delta !== 0) post({ type: 'scrollBy', session, surface, delta: command.delta });
      });
    };
    const range = (metrics: FrameScrollMetrics) => metrics.height - metrics.viewport;
    send.current = (top) => {
      if (!Number.isFinite(top) || current.current === null) return;
      queue({ top: Math.max(0, Math.min(top, range(current.current))) });
    };
    nudge.current = (delta) => {
      if (!Number.isFinite(delta) || current.current === null) return;
      if (pending !== null && 'top' in pending) queue({ top: Math.max(0, Math.min(pending.top + delta, range(current.current))) });
      else queue({ delta: (pending?.delta ?? 0) + delta });
    };
    guest.addEventListener('ipc-message', onMessage);
    const unbind = bindGuestReady(guest, ready);
    guest.addEventListener('did-start-loading', reset);
    guest.addEventListener('render-process-gone', reset);
    guest.addEventListener('destroyed', reset);
    return () => {
      send.current = null;
      nudge.current = null;
      if (session !== 0) post({ type: 'observe', session, enabled: false });
      reset();
      unbind();
      guest.removeEventListener('ipc-message', onMessage);
      guest.removeEventListener('did-start-loading', reset);
      guest.removeEventListener('render-process-gone', reset);
      guest.removeEventListener('destroyed', reset);
    };
  }, [ref, instance, enabled]);

  const scrollTo = useCallback((top: number) => send.current?.(top), []);
  const scrollBy = useCallback((delta: number) => nudge.current?.(delta), []);
  return { metrics: enabled ? metrics : null, scrollTo, scrollBy };
}

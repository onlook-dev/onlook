import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { HStack, Stack } from '@astryxdesign/core/Layout';
import { Kbd } from '@astryxdesign/core/Kbd';
import { SHORTCUTS } from '../../shortcuts/registry.js';
import { HINT_SURFACE } from '../hintSurface.js';
import { prefersReducedMotion, step, type Spring } from '../spring.js';
import { MorphWord } from './MorphWord.jsx';
import { entryOf, indexOf, type PreviewContext, type PreviewId } from './registry.js';
import type { ToolPreviewState } from './useToolPreview.js';
import { LAYER } from '../../overlay/layers.js';

const SLIDE = 28;
const BLUR = 4;

const SHELL: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 5px)',
  transform: 'translateX(-50%)',
  pointerEvents: 'none',
  overflow: 'hidden',
  zIndex: LAYER.raised,
  padding: 'var(--spacing-2)',
  borderRadius: 18,
  cornerShape: 'squircle',
  border: '0.5px solid var(--color-border)',
  boxShadow: 'var(--shadow-med)',
  backgroundColor: 'var(--color-background-surface)',
  backgroundImage: 'linear-gradient(90deg, transparent 45%, var(--studio-ground) 100%)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  animation: 'tpp-open 160ms ease-out',
} as CSSProperties;

/** `value` runs −1 … 0 … 1: 0 is shown, ±1 is off to that side. */
interface Pane extends Spring {
  id: PreviewId;
}

export function ToolPreviewPopover({
  state,
  id,
  running = false,
  hasFrames = true,
}: {
  state: ToolPreviewState | null;
  /** The id the hovered control's `aria-describedby` points at. */
  id: string;
  running?: boolean;
  hasFrames?: boolean;
}) {
  const [panes, setPanes] = useState<PreviewId[]>([]);
  const [seenId, setSeenId] = useState<PreviewId | null>(null);
  // Adjusted during render, not in an effect: React's pattern for state that tracks a prop.
  const nextId = state?.id ?? null;
  if (nextId !== seenId) {
    setSeenId(nextId);
    if (nextId === null) setPanes([]);
    else if (prefersReducedMotion()) setPanes([nextId]);
    else if (!panes.includes(nextId)) setPanes([...panes, nextId]);
  }
  const springs = useRef(new Map<PreviewId, Pane>());
  const x = useRef<Spring | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const paneEls = useRef(new Map<PreviewId, HTMLDivElement>());
  const frame = useRef<number | undefined>(undefined);
  const last = useRef<number | undefined>(undefined);
  const currentRef = useRef<PreviewId | undefined>(undefined);
  useLayoutEffect(() => {
    currentRef.current = state?.id;
  });

  const paint = useCallback(() => {
    if (shell.current && x.current) shell.current.style.left = `${String(x.current.value)}px`;
    for (const pane of springs.current.values()) {
      const el = paneEls.current.get(pane.id);
      if (!el) continue;
      const amount = Math.min(1, Math.abs(pane.value));
      el.style.transform = `translateX(${String(pane.value * SLIDE)}px)`;
      el.style.opacity = String(1 - amount);
      el.style.filter = pane.id === currentRef.current ? 'none' : `blur(${String(amount * BLUR)}px)`;
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const dt = Math.min(0.032, (now - (last.current ?? now)) / 1000);
      last.current = now;
      let moving = false;
      if (x.current && !step(x.current, dt, 0.01)) moving = true;
      const gone: PreviewId[] = [];
      for (const pane of springs.current.values()) {
        const settled = step(pane, dt);
        if (!settled) moving = true;
        else if (pane.id !== currentRef.current && pane.target !== 0) gone.push(pane.id);
      }
      paint();
      if (gone.length > 0) {
        gone.forEach((goneId) => springs.current.delete(goneId));
        const goneSet = new Set(gone);
        setPanes((prev) => prev.filter((paneId) => !goneSet.has(paneId)));
      }
      frame.current = moving ? requestAnimationFrame(tick) : undefined;
      if (!moving) last.current = undefined;
    },
    [paint],
  );

  useEffect(() => {
    if (state === null) {
      springs.current.clear();
      x.current = null;
      return;
    }
    const reduced = prefersReducedMotion();
    if (x.current === null || reduced) x.current = { value: state.x, velocity: 0, target: state.x };
    else x.current.target = state.x;

    const panesNow = springs.current;
    if (reduced) {
      panesNow.clear();
      panesNow.set(state.id, { id: state.id, value: 0, velocity: 0, target: 0 });
      paint();
      return;
    }
    const previous = [...panesNow.values()].find((p) => p.target === 0 && p.id !== state.id);
    const dir = previous ? Math.sign(indexOf(state.id) - indexOf(previous.id)) : 0;
    for (const pane of panesNow.values()) {
      if (pane.id !== state.id) pane.target = -(dir || Math.sign(pane.value) || 1);
    }
    const existing = panesNow.get(state.id);
    if (existing) existing.target = 0;
    else panesNow.set(state.id, { id: state.id, value: dir, velocity: 0, target: 0 });
    if (frame.current === undefined) frame.current = requestAnimationFrame(tick);
  }, [state, tick, paint]);

  useEffect(() => {
    paint();
  });

  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      frame.current = undefined;
    },
    [],
  );

  if (state === null) return null;
  return (
    <div ref={shell} id={id} role="tooltip" data-tool-preview style={{ ...SHELL, left: x.current?.value ?? state.x }}>
      <HStack gap={4} vAlign="center">
        <PreviewLabel id={state.id} context={{ running, hasFrames }} />
        <div style={{ display: 'grid' }} aria-hidden data-accent="canvas">
          {panes.map((paneId) => {
            const Content = entryOf(paneId).Content;
            return (
              <div
                key={paneId}
                data-tpp-pane
                ref={(el) => {
                  if (el) paneEls.current.set(paneId, el);
                  else paneEls.current.delete(paneId);
                }}
                style={{ gridArea: '1 / 1' }}
              >
                <Content running={running} />
              </div>
            );
          })}
        </div>
      </HStack>
    </div>
  );
}

function PreviewLabel({ id, context }: { id: PreviewId; context: PreviewContext }) {
  const entry = entryOf(id);
  const [first, second] = entry.lines(context);
  return (
    <div style={{ ...HINT_SURFACE, paddingLeft: 6, minWidth: 118, flexShrink: 0 }}>
      <Stack gap={1.5} style={{ alignItems: 'flex-start' }}>
        <span style={{ fontSize: 14, lineHeight: 1.2, color: 'var(--color-on-dark)' }}>
          <MorphWord word={first} />
          {second === undefined ? null : (
            <>
              <br />
              <MorphWord word={second} />
            </>
          )}
        </span>
        {entry.shortcut === undefined ? null : (
          <span key={id} style={{ animation: 'tpp-key 200ms ease-out' }}>
            <Kbd keys={SHORTCUTS[entry.shortcut].keys} />
          </span>
        )}
      </Stack>
    </div>
  );
}


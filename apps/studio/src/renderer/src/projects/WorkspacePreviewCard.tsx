import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { prefersReducedMotion, SPRING_EASING } from '../canvas/spring.js';
import type { Workspace } from './ProjectsSidebar.js';
import { LAYER } from '../overlay/layers.js';
import './projects.css';

const CLOSE_DELAY = 140;
const CARD_WIDTH = 280;
const GAP = 8;
const RADIUS = 18;
const INSET = 8;

const SHELL: CSSProperties = {
  position: 'fixed',
  width: CARD_WIDTH,
  zIndex: LAYER.card,
  pointerEvents: 'none',
  padding: INSET,
  borderRadius: RADIUS,
  cornerShape: 'squircle',
  border: '0.5px solid var(--color-border)',
  boxShadow: 'var(--shadow-med)',
  backgroundColor: 'var(--color-background-surface)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  animation: 'wpc-open 160ms ease-out',
} as CSSProperties;

const IMAGE_BOX: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 10',
  /* Concentric with the shell: its radius less the inset, in the same corner shape. */
  borderRadius: RADIUS - INSET,
  cornerShape: 'squircle',
  overflow: 'hidden',
  background: 'var(--color-background-muted)',
} as CSSProperties;

const IMAGE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'top',
  transition: 'opacity 160ms ease',
};

interface Shown {
  id: string;
  top: number;
  left: number;
}

/** One card for the whole list: moving between rows glides it instead of closing and reopening (ONL-2744). */
export function useWorkspacePreview(workspaces: readonly Workspace[]) {
  const [shown, setShown] = useState<Shown | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setShown(null), CLOSE_DELAY);
  }, []);

  const onPointerOver = useCallback(
    (event: React.PointerEvent) => {
      const row = (event.target as Element).closest<HTMLElement>('[data-workspace-id]');
      const id = row?.dataset.workspaceId;
      const workspace = id === undefined ? undefined : workspaces.find((w) => w.id === id);
      if (row === null || workspace?.previewSrc === undefined) {
        close();
        return;
      }
      window.clearTimeout(closeTimer.current);
      const box = row.getBoundingClientRect();
      const top = box.top;
      const left = box.right + GAP;
      setShown((prev) => (prev?.id === workspace.id ? prev : { id: workspace.id, top, left }));
    },
    [workspaces, close],
  );

  const dismiss = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setShown(null);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return { shown, onPointerOver, onPointerLeave: close, onPointerDown: dismiss };
}

export function WorkspacePreviewCard({
  shown,
  workspaces,
}: {
  shown: Shown | null;
  workspaces: readonly Workspace[];
}): React.JSX.Element | null {
  /* Every image seen this hover stays mounted, so a return trip is a fade, not a reload. */
  const [seen, setSeen] = useState<string[]>([]);
  const [isFirstFrame, setIsFirstFrame] = useState(true);
  if (shown === null && seen.length > 0) {
    setSeen([]);
    setIsFirstFrame(true);
  }
  if (shown !== null && !seen.includes(shown.id)) setSeen([...seen, shown.id]);

  useEffect(() => {
    if (shown === null || !isFirstFrame) return;
    const frame = requestAnimationFrame(() => setIsFirstFrame(false));
    return () => cancelAnimationFrame(frame);
  }, [shown, isFirstFrame]);

  if (shown === null) return null;
  if (!workspaces.some((w) => w.id === shown.id)) return null;
  const glide = isFirstFrame || prefersReducedMotion() ? 'none' : `top ${String(SPRING_EASING.duration)}ms ${SPRING_EASING.easing}`;

  return (
    <div role="tooltip" data-testid="workspace-preview-card" style={{ ...SHELL, top: shown.top, left: shown.left, transition: glide }}>
      <div style={IMAGE_BOX}>
        {seen.map((id) => {
          const src = workspaces.find((w) => w.id === id)?.previewSrc;
          return src === undefined ? null : (
            <img key={id} src={src} alt="" draggable={false} style={{ ...IMAGE, opacity: id === shown.id ? 1 : 0 }} />
          );
        })}
      </div>
    </div>
  );
}

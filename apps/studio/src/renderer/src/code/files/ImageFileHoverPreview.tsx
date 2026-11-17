import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { codeImageMediaType } from '@studio/events';
import { ignoreRefusal } from '../../refusal.js';
import { studio } from '../../bridge.js';
import './files.css';

const HOVER_DELAY_MS = 180;
const GAP = 18;
const EDGE = 8;

/** Prefer below/right of the pointer, flip at the edges, and fit small windows. */
export function imageHoverPosition(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  const left = x + GAP + width > viewportWidth - EDGE ? x - GAP - width : x + GAP;
  const top = y + GAP + height > viewportHeight - EDGE ? y - GAP - height : y + GAP;
  return {
    x: Math.max(EDGE, Math.min(left, viewportWidth - width - EDGE)),
    y: Math.max(EDGE, Math.min(top, viewportHeight - height - EDGE)),
  };
}

/** One delegated hover for the tree and search results; pointer movement never re-renders the list. */
export function ImageFileHoverPreview(): React.JSX.Element {
  const anchor = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const decoded = useRef<() => void>(() => undefined);
  const failed = useRef<() => void>(() => undefined);
  const [image, setImage] = useState<{ path: string; dataUrl: string } | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    const owner = anchor.current?.closest('[data-testid="code-files"]');
    if (owner === undefined || owner === null) return;
    let path: string | null = null;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let pointer = { x: 0, y: 0 };

    const position = (): void => {
      frame = 0;
      const element = card.current;
      if (element === null) return;
      const point = imageHoverPosition(pointer.x, pointer.y, element.offsetWidth, element.offsetHeight, window.innerWidth, window.innerHeight);
      element.style.transform = `translate3d(${String(point.x)}px, ${String(point.y)}px, 0)`;
    };
    const hide = (): void => {
      generation += 1;
      path = null;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      frame = 0;
      setImage(null);
      setReady(false);
    };
    const hover = (event: Event): void => {
      if (!(event instanceof PointerEvent) || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      const row = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-testid="code-files-file"], [data-testid="code-files-name"], [data-testid="code-files-line"]')
        : null;
      const next = row?.dataset.path ?? null;
      const imagePath = next !== null && codeImageMediaType(next) !== null ? next : null;
      if (imagePath !== path) {
        hide();
        path = imagePath;
        if (imagePath !== null) {
          const requested = generation;
          timer = setTimeout(() => {
            void studio().codeRead({ path: imagePath }).then((answer) => {
              if (generation !== requested || !answer.ok || answer.image === undefined) return;
              setImage({ path: imagePath, dataUrl: answer.image.dataUrl });
            }).catch(ignoreRefusal('code', 'image hover'));
          }, HOVER_DELAY_MS);
        }
      }
      if (frame === 0) frame = requestAnimationFrame(position);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') hide();
    };
    // Decode can finish with a stationary cursor; place before revealing it.
    decoded.current = (): void => { position(); setReady(true); };
    failed.current = hide;
    owner.addEventListener('pointerover', hover);
    owner.addEventListener('pointermove', hover);
    owner.addEventListener('pointerleave', hide);
    owner.addEventListener('pointerdown', hide);
    owner.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', escape);
    return () => {
      generation += 1;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      owner.removeEventListener('pointerover', hover);
      owner.removeEventListener('pointermove', hover);
      owner.removeEventListener('pointerleave', hide);
      owner.removeEventListener('pointerdown', hide);
      owner.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', escape);
      decoded.current = () => undefined;
      failed.current = () => undefined;
    };
  }, []);

  return <>
    <span hidden ref={anchor} />
    {image !== null && createPortal(
      <div ref={card} className="code-image-hover" data-testid="code-image-hover" data-ready={isReady} aria-hidden="true">
        <img key={image.path} src={image.dataUrl} alt="" onLoad={() => decoded.current()} onError={() => failed.current()} />
      </div>, document.body,
    )}
  </>;
}

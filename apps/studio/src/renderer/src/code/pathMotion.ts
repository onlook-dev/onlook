import { useLayoutEffect, useRef, type RefObject } from 'react';
import { LAYER } from '../overlay/layers.js';
import './code.css';

type MotionPreference = Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;
type AnimatedSegment = Pick<HTMLElement, 'animate'>;

/** Reveal one continuous path from the repository outward; retract along the same edge. */
export function animatePath(
  tail: AnimatedSegment | null,
  direction: 'enter' | 'exit',
  motion: MotionPreference,
  onDone: () => void,
): () => void {
  if (motion.matches || tail === null) {
    onDone();
    return () => undefined;
  }
  const hidden = { opacity: 0, clipPath: 'inset(0 100% 0 0)' };
  const shown = { opacity: 1, clipPath: 'inset(0 0 0 0)' };
  const animation = tail.animate(direction === 'enter' ? [hidden, shown] : [shown, hidden],
    { duration: direction === 'enter' ? 240 : 180, easing: 'cubic-bezier(0.2, 0, 0.2, 1)', fill: 'both' });
  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    motion.removeEventListener('change', finish);
    animation.cancel();
    onDone();
  };
  motion.addEventListener('change', finish);
  void animation.finished.then(finish, finish);
  return finish;
}

function removeExit(host: HTMLElement): void {
  const previous = host.querySelector<HTMLElement>('[data-testid="code-path-exit"]');
  if (!previous) return;
  for (const animation of previous.getAnimations({ subtree: true })) animation.cancel();
  previous.remove();
}

/** A short, noninteractive exit copy survives Code's unmount. The live path stays accessible. */
export function usePathPresence(row: RefObject<HTMLDivElement | null>, isVisible: boolean, pathVersion: string, width: number): void {
  const snapshot = useRef<{ host: HTMLElement; copy: HTMLDivElement } | null>(null);
  const enterStop = useRef<(() => void) | null>(null);
  const previousPath = useRef(pathVersion);
  useLayoutEffect(() => {
    if (previousPath.current !== pathVersion) {
      // A file update interrupts an appearance; it must remain an immediate path update.
      enterStop.current?.();
      enterStop.current = null;
    }
    previousPath.current = pathVersion;
    const element = row.current;
    if (!isVisible || !element) return;
    const host = element.closest<HTMLElement>('[data-testid="left-panel-content"]')
      ?? element.closest<HTMLElement>('[data-testid="code-panel-header"]');
    if (!host) return;
    const box = element.getBoundingClientRect();
    const origin = host.getBoundingClientRect();
    const copy = element.cloneNode(true) as HTMLDivElement;
    copy.removeAttribute('data-path-appearing');
    copy.removeAttribute('data-testid');
    for (const child of copy.querySelectorAll('[data-testid]')) child.removeAttribute('data-testid');
    copy.dataset.testid = 'code-path-exit';
    copy.setAttribute('aria-hidden', 'true');
    // The destination header owns the repository name; the copy retains only its space.
    if (copy.firstElementChild instanceof HTMLElement) copy.firstElementChild.style.visibility = 'hidden';
    Object.assign(copy.style, { position: 'absolute', top: `${String(box.top - origin.top)}px`,
      left: `${String(box.left - origin.left)}px`, width: `${String(box.width)}px`,
      pointerEvents: 'none', zIndex: String(LAYER.over) });
    snapshot.current = { host, copy };
  }, [row, isVisible, pathVersion, width]);

  useLayoutEffect(() => {
    const element = row.current;
    if (!isVisible || !element) return;
    const host = snapshot.current?.host;
    if (host) removeExit(host);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    element.dataset.pathAppearing = '';
    let stop = (): void => { element.removeAttribute('data-path-appearing'); };
    const play = (): void => {
      stop = animatePath(element.querySelector<HTMLElement>('[data-path-tail]'), 'enter', motion,
        () => {
          element.removeAttribute('data-path-appearing');
          enterStop.current = null;
        });
      enterStop.current = stop;
    };
    // Initial width measurement settles before the reveal starts.
    const frame = motion.matches ? null : requestAnimationFrame(play);
    if (motion.matches) play();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      stop();
      enterStop.current = null;
      const held = snapshot.current;
      if (!held || !held.host.isConnected) return;
      removeExit(held.host);
      held.host.append(held.copy);
      animatePath(held.copy.querySelector<HTMLElement>('[data-path-tail]'), 'exit', motion,
        () => held.copy.remove());
    };
  }, [row, isVisible]);
}

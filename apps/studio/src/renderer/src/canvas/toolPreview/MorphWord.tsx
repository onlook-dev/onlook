import { useLayoutEffect, useRef, useState } from 'react';
import { prefersReducedMotion, SPRING_EASING } from '../spring.js';
import { charKeys } from './charKeys.js';

const LIFT = 4;

export function MorphWord({ word }: { word: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const lefts = useRef(new Map<string, { left: number; char: string }>());
  const [exiting, setExiting] = useState<{ key: string; char: string; left: number; id: number }[]>([]);
  const exitSeq = useRef(0);
  const chars = charKeys(word);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const before = prefersReducedMotion() ? new Map<string, { left: number; char: string }>() : lefts.current;
    const after = new Map<string, { left: number; char: string }>();
    const leaving: { key: string; char: string; left: number; id: number }[] = [];
    const nodes = [...el.querySelectorAll<HTMLSpanElement>('[data-char]')];
    for (const node of nodes) {
      const key = node.dataset.char ?? '';
      const visual = node.getBoundingClientRect().left - el.getBoundingClientRect().left;
      node.getAnimations().forEach((a) => a.cancel());
      const left = node.offsetLeft;
      after.set(key, { left, char: node.textContent ?? '' });
      const prior = before.get(key);
      if (before.size === 0) continue;
      if (prior) {
        const dx = prior.left + (visual - left) - left;
        if (Math.abs(dx) > 0.5) node.animate([{ transform: `translateX(${String(dx)}px)` }, { transform: 'none' }], SPRING_EASING);
      } else {
        node.animate(
          [{ opacity: 0, transform: `translateY(${String(LIFT)}px)`, filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'none' }],
          SPRING_EASING,
        );
      }
    }
    for (const [key, prior] of before) {
      if (!after.has(key)) leaving.push({ key, char: prior.char, left: prior.left, id: (exitSeq.current += 1) });
    }
    lefts.current = after;
    if (leaving.length > 0) setExiting((prev) => [...prev, ...leaving]);
  }, [word]);

  return (
    <span ref={root} style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre' }}>
      {chars.map(({ key, char }) => (
        <span key={key} data-char={key} style={{ display: 'inline-block' }}>
          {char}
        </span>
      ))}
      {exiting.map(({ id, char, left }) => (
        <span
          key={`x${String(id)}`}
          ref={(node) => {
            if (!node || node.dataset.running) return;
            node.dataset.running = '1';
            node
              .animate(
                [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: `translateY(${String(-LIFT)}px)`, filter: 'blur(2px)' }],
                { ...SPRING_EASING, fill: 'forwards' },
              )
              .finished.then(() => setExiting((prev) => prev.filter((x) => x.id !== id)))
              .catch(() => undefined);
          }}
          style={{ position: 'absolute', left, top: 0, display: 'inline-block' }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}


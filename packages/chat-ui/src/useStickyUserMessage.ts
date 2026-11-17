/** A hook, not `position: sticky` in CSS: plain sticky leaves EVERY passed prompt stuck and stacked, and one row at a time is a decision about scroll position that no selector expresses. */
/** The real `[data-role="user"]` row is pinned, never a copy of it. */

import { useEffect } from 'react';

/** The stacking is the point, not a defect to design out. */
const STUCK_GAP = 8;

/** A `top` offset, never padding: padding changes the row's height IN FLOW, and the resulting stick/reflow/un-stick fight is the reported jitter. */
const PIN_TOP = 8;
const PIN_TOP_PX = `${PIN_TOP}px`;

const SCRIM_RAMP = 40;

/** A passed prompt, or an import's running setup row (ONL-2961); `data-role` stays the harness's turn key, so the setup row carries its own mark. */
const PIN_ROWS = '[data-role="user"], [data-chat-pin]';

export interface StickyPlan {
  /** Row to pin, or -1 when no prompt has been passed. */
  pinned: number;
  /** `--stuck`, 0 to 1. */
  scrim: number;
  /** `translateY` for the pinned row, or null when the next prompt is not yet pushing it out. */
  lift: number | null;
}

/** Measurements in, decision out, so every read lands before the first write; `heightOf` runs once, for the pinned row only (ONL-2553). */
export function planStickyPass(
  tops: readonly number[],
  heightOf: (index: number) => number,
): StickyPlan {
  /* `<= PIN_TOP`, not 0: a 0 test leaves an 8px band where a row is pinned but not yet counted as passed. */
  let pinned = -1;
  for (let i = 0; i < tops.length; i++) {
    if ((tops[i] as number) <= PIN_TOP) pinned = i;
    else break;
  }
  if (pinned === -1) return { pinned, scrim: 0, lift: null };

  const travel = PIN_TOP - (tops[pinned] as number);
  const scrim = Math.min(1, Math.max(0, travel / SCRIM_RAMP));
  const nextTop = tops[pinned + 1];
  if (nextTop === undefined) return { pinned, scrim, lift: null };
  const height = heightOf(pinned);
  const lift =
    nextTop < PIN_TOP + height + STUCK_GAP ? nextTop - STUCK_GAP - height - PIN_TOP : null;
  return { pinned, scrim, lift };
}

/* The app's stylesheet gives these their values; the pinned row sits under every other user row. */
const PINNED_ROW = 'var(--studio-layer-raised)';
const OTHER_ROW = 'var(--studio-layer-over)';

function clear(row: HTMLElement): void {
  row.style.position = '';
  row.style.top = '';
  row.style.zIndex = '';
  row.style.transform = '';
  row.style.removeProperty('--stuck');
  row.removeAttribute('data-stuck');
}

/** Inline values, never geometry: reading `style` costs no layout, and skipping an unchanged write keeps the pass off the critical path. */
function isCleared(row: HTMLElement): boolean {
  return row.style.position === '' && !row.hasAttribute('data-stuck');
}

/** Layout position inside the scroller. A transform never moves it; an ENGAGED `position: sticky` does, which is why the caller drops the pinned row's sticky first (ONL-2553). */
function flowTop(row: HTMLElement, scroller: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = row;
  while (node !== null && node !== scroller) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

/** A tapped task takes no height in flow and shows only while pinned (ONL-2899). */
function pinnedHeight(row: HTMLElement): number {
  return row.querySelector<HTMLElement>('.chat-suggestion-pin-body')?.offsetHeight ?? row.offsetHeight;
}

function observeTranscriptRows(scroller: HTMLElement, observer: ResizeObserver, observed: Set<Element>): Set<Element> {
  const transcript = scroller.querySelector('[data-testid="chat-transcript"]');
  const inner = transcript?.firstElementChild;
  const containers = new Set([scroller, ...Array.from(scroller.children), ...(transcript ? [transcript] : []), ...(inner ? [inner] : [])]);
  const targets = new Set([...containers, ...Array.from(inner?.children ?? [])]);
  for (const target of observed) {
    if (targets.has(target)) continue;
    observer.unobserve(target);
    observed.delete(target);
  }
  for (const target of targets) {
    if (observed.has(target)) continue;
    observer.observe(target);
    observed.add(target);
  }
  return containers;
}

export function useStickyUserMessage(scrollerRef: React.RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let pinnedRow: HTMLElement | undefined;
    let pinnedTop = 0;
    let layoutChanged = true;

    function apply(): void {
      if (!scroller) return;
      const rows = Array.from(scroller.querySelectorAll<HTMLElement>(PIN_ROWS));
      if (rows.length === 0) return;

      // An engaged sticky makes `offsetTop` report the pin line, so this is the one write before the reads (ONL-2553).
      for (const row of layoutChanged ? rows : []) {
        if (!row.hasAttribute('data-stuck')) continue;
        row.style.position = 'relative';
        // `top` goes with it, or `offsetTop` counts the 8px offset instead and the row measures low.
        row.style.top = '';
      }

      const scrollTop = scroller.scrollTop;
      const tops = rows.map((row) => (row === pinnedRow && !layoutChanged ? pinnedTop : flowTop(row, scroller)) - scrollTop);
      const plan = planStickyPass(tops, (index) => pinnedHeight(rows[index] as HTMLElement));
      pinnedRow = rows[plan.pinned];
      pinnedTop = plan.pinned === -1 ? 0 : (tops[plan.pinned] as number) + scrollTop;
      layoutChanged = false;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as HTMLElement;
        if (i !== plan.pinned) {
          if (plan.pinned === -1) {
            if (!isCleared(row)) clear(row);
            continue;
          }
          if (row.hasAttribute('data-stuck')) clear(row);
          /* The pinned row at 1 and every other user row at 2 is what keeps the scrim off the next prompt. */
          if (row.style.position !== 'relative') row.style.position = 'relative';
          if (row.style.zIndex !== OTHER_ROW) row.style.zIndex = OTHER_ROW;
          continue;
        }
        // Only the scrim and the lift move between frames; rewriting the rest would be the churn this pass exists to avoid.
        // Pushed, the row sits at a content offset scrolling never changes, so threaded scroll carries it with the next prompt (ONL-2744).
        const position = plan.lift === null ? 'sticky' : 'relative';
        const top = plan.lift === null ? PIN_TOP_PX : `${String(plan.lift + PIN_TOP - (tops[i] as number))}px`;
        if (row.style.position !== position) row.style.position = position;
        if (row.style.top !== top) row.style.top = top;
        if (row.style.zIndex !== PINNED_ROW) row.style.zIndex = PINNED_ROW;
        if (!row.hasAttribute('data-stuck')) row.setAttribute('data-stuck', 'true');
        // A DOM write, so scrolling never re-renders the transcript.
        const scrim = String(plan.scrim);
        if (row.style.getPropertyValue('--stuck') !== scrim) row.style.setProperty('--stuck', scrim);
      }
    }

    // Many scroll events land in one frame; the rAF merges them and still runs before that frame paints (ONL-2553).
    let frame: number | null = null;
    const schedule = (): void => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        apply();
      });
    };
    // A resize callback already runs once per frame, after layout and before paint, so deferring it to a rAF would paint one frame on the old pin (ONL-2553).
    const applyNow = (): void => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      apply();
    };

    // The scrim's containing block, and where the offsetParent walk every measurement depends on has to end.
    scroller.style.position = 'relative';

    apply();
    // The transcript changes height without scrolling — a streaming reply, a tool group expanding — and that moves the rows this measures.
    // Native, not Astryx's shared `observeResize`: it keys one callback per element, and `useTranscriptFollow` observes this same scroller and children, so one registration would drop the other's (ONL-2650).
    const widths = new WeakMap<Element, number>();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (containers.has(entry.target)) {
          const width = entry.contentRect.width;
          if (widths.get(entry.target) !== width) layoutChanged = true;
          widths.set(entry.target, width);
        } else if (pinnedRow && (entry.target === pinnedRow || (entry.target.compareDocumentPosition(pinnedRow) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)) {
          layoutChanged = true;
        }
      }
      applyNow();
    });
    const observed = new Set<Element>();
    let containers = observeTranscriptRows(scroller, observer, observed);
    const mutations = new MutationObserver((records) => {
      const membershipChanged = records.some(record => record.type === 'childList' && containers.has(record.target as Element));
      const stylesChanged = records.some(record => {
        if (record.type !== 'attributes' || !observed.has(record.target as Element)) return false;
        const target = record.target as Element;
        return !(target.matches(PIN_ROWS) && (record.attributeName === 'style' || record.attributeName === 'data-stuck'));
      });
      if (!membershipChanged && !stylesChanged) return;
      if (membershipChanged) containers = observeTranscriptRows(scroller, observer, observed);
      layoutChanged = true;
      schedule();
    });
    mutations.observe(scroller, { childList: true, subtree: true, attributes: true });
    scroller.addEventListener('scroll', schedule, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', schedule);
      observer.disconnect();
      mutations.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      for (const row of Array.from(
        scroller.querySelectorAll<HTMLElement>(PIN_ROWS),
      )) {
        clear(row);
      }
    };
  }, [scrollerRef]);
}

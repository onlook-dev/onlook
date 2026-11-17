/** A workaround for three measured `@astryxdesign/core@0.1.9` follow-lock defects, cooperating from `ChatLayout`'s own element because neither library hook is reachable from outside it (ONL-1934, ONL-1953). */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** `useChatStreamScroll`'s own defaults at 0.1.9; `ChatLayout` passes no options, so a library bump moves these. */
const LOCK_THRESHOLD = 10;
const BUTTON_THRESHOLD = 100;

export interface ScrollGeometry {
  scrollHeight: number;
  scrollTop: number;
  offsetHeight: number;
}

export function distanceFromBottom(geometry: ScrollGeometry): number {
  return geometry.scrollHeight - geometry.scrollTop - geometry.offsetHeight;
}

export function shouldRearmFollow(geometry: ScrollGeometry): boolean {
  return distanceFromBottom(geometry) <= LOCK_THRESHOLD;
}

export function openAtEndScrollTop(view: { scrollHeight: number; clientHeight: number }): number | null {
  const target = view.scrollHeight - view.clientHeight;
  return target > 0 ? target : null;
}

export function isAwayFromBottom(geometry: ScrollGeometry): boolean {
  return distanceFromBottom(geometry) > BUTTON_THRESHOLD;
}

export interface TranscriptFollow {
  /** Goes on `ChatLayout` — its root is the scroll container. */
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
  hasNewMessages: boolean;
  scrollToBottom: () => void;
  /** Keeps the end in view for `ms` while a row animates its height, if the view is at the end now. */
  holdEnd: (ms: number) => void;
}

export function useTranscriptFollow(messageCount: number): TranscriptFollow {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isAway, setIsAway] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const isAwayRef = useRef(false);
  const lastCountRef = useRef(messageCount);
  const lastHeightsRef = useRef<{ scrollHeight: number; offsetHeight: number } | null>(null);

  /** Entry is a MODE, not a one-shot pin: the transcript arrives a beat after mount and keeps growing, and a single pin leaves the library to animate every later growth. */
  const isEnteringRef = useRef(true);
  const holdUntilRef = useRef(0);
  const holdsEnd = useCallback(() => isEnteringRef.current || performance.now() < holdUntilRef.current, []);

  const pinToEnd = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = openAtEndScrollTop(el);
    if (target === null) return;
    if (Math.abs(el.scrollTop - target) < 1) return;
    /* Forced, because a smooth rule anywhere above this element would animate the very travel being removed. */
    const prior = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollTop = target;
    el.style.scrollBehavior = prior;
  }, []);

  /* Before paint, or the first frame shows the top and the correction becomes the jump; every render, because the render that first has content is not knowable ahead of time. */
  useLayoutEffect(() => {
    if (isEnteringRef.current) pinToEnd();
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const release = (): void => {
      isEnteringRef.current = false;
      holdUntilRef.current = 0;
    };
    /* `pointerdown` covers a scrollbar drag, which emits no wheel and would otherwise be fought by the re-pin below. */
    el.addEventListener('wheel', release, { passive: true });
    el.addEventListener('touchstart', release, { passive: true });
    el.addEventListener('pointerdown', release, { passive: true });
    el.addEventListener('keydown', release);

    /* Re-pinning on the library's own scroll events cancels its follow spring, which travels with no size change and no re-render; entry never ENDS on a scroll, because the arrival emits them too. */
    const repin = (): void => {
      if (holdsEnd()) pinToEnd();
    };
    el.addEventListener('scroll', repin, { passive: true });
    /* CAPTURE, because `load` does not bubble; an image resolving inside a row grows the transcript with no render and no resize of any box observed below. */
    el.addEventListener('load', repin, { capture: true });

    // Native, not Astryx's shared `observeResize`: it keys one callback per element and `useStickyUserMessage` observes this same scroller and children, so one registration would drop the other's (ONL-2650).
    const observer = new ResizeObserver(() => {
      if (holdsEnd()) pinToEnd();
    });
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);

    return () => {
      el.removeEventListener('wheel', release);
      el.removeEventListener('touchstart', release);
      el.removeEventListener('pointerdown', release);
      el.removeEventListener('keydown', release);
      el.removeEventListener('scroll', repin);
      el.removeEventListener('load', repin, { capture: true });
      observer.disconnect();
    };
  }, [pinToEnd, holdsEnd]);

  /* An emptied conversation is a new one about to arrive; it opens at its own end, however far the last one was scrolled. */
  useEffect(() => {
    if (messageCount === 0) isEnteringRef.current = true;
  }, [messageCount]);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    /* The height-change flush: the ref is written BEFORE the dispatch, because the dispatched event re-enters this listener synchronously and the already-updated ref is what stops it dispatching forever. */
    const { scrollHeight, offsetHeight } = el;
    const last = lastHeightsRef.current;
    lastHeightsRef.current = { scrollHeight, offsetHeight };
    if (last && (last.scrollHeight !== scrollHeight || last.offsetHeight !== offsetHeight)) {
      el.dispatchEvent(new Event('scroll'));
    }

    if (shouldRearmFollow(el)) {
      /* A bare `Event` carries no geometry: this works because the library's `onScrollEnd` reads the element and never touches the event (0.1.9). */
      el.dispatchEvent(new Event('scrollend'));
    }

    const away = isAwayFromBottom(el);
    if (away === isAwayRef.current) return;
    isAwayRef.current = away;
    setIsAway(away);
    if (!away) setHasNewMessages(false);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    return () => el.removeEventListener('scroll', measure);
  }, [measure]);

  // Deliberately every render and no dep array; `measure` sets state only when the answer changes, so this settles rather than looping.
  useLayoutEffect(measure);

  useEffect(() => {
    if (messageCount > lastCountRef.current && isAwayRef.current) {
      setHasNewMessages(true);
    }
    lastCountRef.current = messageCount;
  }, [messageCount]);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight - el.clientHeight;
    setHasNewMessages(false);
    measure();
  }, [measure]);

  const holdEnd = useCallback((ms: number) => {
    const el = scrollerRef.current;
    if (!el || !shouldRearmFollow(el)) return;
    holdUntilRef.current = performance.now() + ms;
  }, []);

  return {
    holdEnd,
    scrollerRef,
    isVisible: isAway || hasNewMessages,
    hasNewMessages,
    scrollToBottom,
  };
}

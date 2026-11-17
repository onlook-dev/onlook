import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChromeExtent } from '@studio/events';

/** Clears both band tooltips: the git one wraps at the theme's 240px cap (ONL-2485). */
const TOOLTIP_STRIP: ChromeExtent = { kind: 'strip', height: 160 };

/** ~200ms at 60Hz. Past it the layer shows anyway; anchor positioning re-places it on the next layout. */
const BACKSTOP_FRAMES = 12;

export function widestExtent(claims: Iterable<ChromeExtent>): ChromeExtent {
  let widest: ChromeExtent = { kind: 'band' };
  for (const claim of claims) {
    if (claim.kind === 'full') return claim;
    if (widest.kind === 'band') {
      widest = claim;
      continue;
    }
    if (claim.kind === 'strip' && widest.kind === 'strip' && claim.height > widest.height) {
      widest = claim;
    }
  }
  return widest;
}

export function sameExtent(a: ChromeExtent, b: ChromeExtent): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'strip' || b.kind !== 'strip' || a.height === b.height;
}

// Counted here, not in main: main cannot tell a released claim from a reloaded renderer, and a desynced count leaves the band stuck open over the tab (ONL-2206).
const claims = new Map<object, ChromeExtent>();
/**
 * No layer may grow the view while true (ONL-2364). HERE rather than per
 * control: every band layer routes through this authority, so one flag covers
 * the tabs, the `+`, both clusters, the git menu — and whatever is added next.
 */
let isSuspended = false;
let applied: ChromeExtent = { kind: 'band' };
let queue: Promise<void> = Promise.resolve();

function viewportReaches(height: number): Promise<void> {
  if (window.innerHeight >= height) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let frames = 0;
    const tick = (): void => {
      if (window.innerHeight >= height || frames >= BACKSTOP_FRAMES) {
        resolve();
        return;
      }
      frames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// `want` is read inside the queued step: a hover-out and a hover-in in one tick resolve to the later intent.
function sync(): Promise<void> {
  queue = queue.then(async () => {
    const want = isSuspended ? ({ kind: 'band' } satisfies ChromeExtent) : widestExtent(claims.values());
    if (sameExtent(applied, want)) return;
    applied = want;
    const { height } = await window.studioChrome.expandChrome(want);
    await viewportReaches(height);
  });
  // A failed grow degrades to a clipped layer, not a dead control.
  queue = queue.catch(() => undefined);
  return queue;
}

export function suspendExpansion(): void {
  if (isSuspended) return;
  isSuspended = true;
  void sync();
}

export function resumeExpansion(): void {
  if (!isSuspended) return;
  isSuspended = false;
  void sync();
}

export interface ChromeExpansion {
  /** Resolves once the viewport is actually taller. */
  claim: (extent: ChromeExtent) => Promise<void>;
  release: () => void;
}

export function useChromeExpansion(): ChromeExpansion {
  const token = useRef<object>({}).current;
  useEffect(
    () => () => {
      claims.delete(token);
      void sync();
    },
    [token],
  );
  return useMemo(
    () => ({
      claim: (extent: ChromeExtent) => {
        // Not recorded while suspended, or a control the pointer merely crossed grows the band once the drag ends.
        if (isSuspended) return Promise.resolve();
        claims.set(token, extent);
        return sync();
      },
      release: () => {
        claims.delete(token);
        void sync();
      },
    }),
    [token],
  );
}

export interface HoverExpansion {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** The release follows the hide, or the view shrinks under a tooltip still fading out. */
  onOpenChange: (isOpen: boolean) => void;
  /** Releases without waiting for a hide: a press that swaps the view never produces one. */
  dismiss: () => void;
}

export function useHoverExpansion(extent: ChromeExtent = TOOLTIP_STRIP): HoverExpansion {
  const expansion = useChromeExpansion();
  const [isOpen, setIsOpen] = useState(false);
  return {
    onMouseEnter: () => void expansion.claim(extent),
    onMouseLeave: () => {
      if (!isOpen) expansion.release();
    },
    onOpenChange: (open: boolean) => {
      setIsOpen(open);
      // Keyboard focus opens with no hover to ride.
      if (open) void expansion.claim(extent);
      else expansion.release();
    },
    dismiss: () => {
      setIsOpen(false);
      expansion.release();
    },
  };
}

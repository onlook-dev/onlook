import { createContext, useContext, useEffect, useEffectEvent, useRef } from 'react';
import type { ChromeSlots } from '@studio/events';

import { TAB_ID, isTabView } from '../tabIdentity.js';
import { studio } from '../bridge.js';

export const BlockedWindowBarContext = createContext(false);

const publishers = new Map<object, ChromeSlots>();
let revision = 0;

function publishSlots(fallback: ChromeSlots = {}): void {
  revision += 1;
  const slots = [...publishers.values()].at(-1) ?? fallback;
  studio().chromeSlots({ tabId: TAB_ID, slots });
}

/** `slots` is a dependency: an unmemoized object pushes across the process boundary on every render (ONL-2206). */
export function useFillWindowBar(slots: ChromeSlots): void {
  const publisher = useRef<object>({}).current;
  const blocked = useContext(BlockedWindowBarContext);
  const effectiveSlots = blocked ? BLENDED_BAND : slots;
  const fallbackOnRelease = useEffectEvent(() => blocked ? BLENDED_BAND : {});
  useEffect(() => {
    if (!isTabView) return;
    publishers.delete(publisher);
    publishers.set(publisher, effectiveSlots);
    publishSlots();
  }, [effectiveSlots, publisher]);

  useEffect(() => {
    if (!isTabView) return;
    return () => {
      publishers.delete(publisher);
      const fallback = fallbackOnRelease();
      const released = ++revision;
      queueMicrotask(() => {
        if (revision === released) publishSlots(fallback);
      });
    };
  }, [publisher]);
}

const BLENDED_BAND: ChromeSlots = { blendsIntoScreen: true };

/** Mounted beside the screen, never inside `OnboardingShell`: that shell remounts between the setup steps, and its cleanup push would blink the band black between the two (ONL-2625). */
export function BlendedWindowBar(): null {
  useFillWindowBar(BLENDED_BAND);
  return null;
}

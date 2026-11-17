import { GIT_PILL_SHIPPED_DEFAULTS, type ChromeSlots } from '@studio/events';

import type { TabPurpose } from './purpose.js';

export function slotsForSession(slots: ChromeSlots, hasSession: boolean): ChromeSlots {
  return hasSession ? slots : { blendsIntoScreen: true, tabsHidden: true };
}

export class SlotBook {
  private readonly byTab = new Map<string, ChromeSlots>();

  record(tabId: string, slots: ChromeSlots): void {
    this.byTab.set(tabId, slots);
  }

  forget(tabId: string): void {
    this.byTab.delete(tabId);
  }

  forTab(tabId: string, purpose: TabPurpose, hasReachedProduct: boolean): ChromeSlots {
    if (!hasReachedProduct) return { blendsIntoScreen: true };
    const recorded = this.byTab.get(tabId);
    if (recorded !== undefined) return recorded;
    return purpose === 'project' ? scaffold() : { showFolder: true };
  }
}

/** The git pill is reserved in its first-paint form, not absent, so the cluster never reflows. */
function scaffold(): ChromeSlots {
  return {
    showFolder: true,
    rails: { left: false, right: false },
    git: { defaults: GIT_PILL_SHIPPED_DEFAULTS, isWorking: false, canSubmit: false },
  };
}

import { NO_CAPABILITIES, PANEL_DEFAULTS, parseBirth, type TabBirthFacts } from '@studio/events';

/* Suites install a partial `window` with no location; a module-scope read there fails the import. */
const BIRTH: TabBirthFacts =
  typeof window === 'undefined' || !window.location
    ? { tabId: '', purpose: 'projects', panels: { ...PANEL_DEFAULTS }, requiresSession: false, capabilities: NO_CAPABILITIES }
    : parseBirth(window.location.search);

/** Rides the load query; the hash is the dev-instrument channel (ONL-2206). */
export const TAB_ID = BIRTH.tabId;

/** Empty on a showroom still or the lab harness; a push there no-ops rather than guessing an id (ONL-2206). */
export const isTabView = TAB_ID !== '';

/** The first paint's rail widths, so the parked surface needs no read to be the right shape (ONL-2318). */
export const BIRTH_PANELS = BIRTH.panels;

/** `parked` draws the editor scaffold and waits to be told what it is (ONL-2318). */
export const BIRTH_PURPOSE = BIRTH.purpose;

/** The access gate's own fact, so no screen can commit before the gate knows whether to close (ONL-2780). */
export const BIRTH_REQUIRES_SESSION = BIRTH.requiresSession;

/** The chrome view is born with these too, though it is no tab. */
export const BIRTH_CAPABILITIES = BIRTH.capabilities;

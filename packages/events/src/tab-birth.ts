import { encodeCapabilities, parseCapabilities, type StudioCapabilities } from './capabilities.js';
import { PANEL_DEFAULTS, PANEL_LIMITS, type PanelsState } from './panels.js';

/** `parked` draws the editor scaffold; `projects` is home (ONL-2318). */
export type TabBirthPurpose = 'parked' | 'projects';

export interface TabBirthFacts {
  tabId: string;
  purpose: TabBirthPurpose;
  panels: PanelsState;
  /** Whether this build signs people in: a gate decided from a read would open for the window before it answers (ONL-2780). */
  requiresSession: boolean;
  /** What the provider can do, so no surface it cannot serve is drawn and then taken away. */
  capabilities: StudioCapabilities;
}

/** One record for both `loadTab` branches: a dev query string and a packaged `loadFile` query cannot drift (ONL-2318). */
export function birthQuery(facts: TabBirthFacts): Record<string, string> {
  return {
    tab: facts.tabId,
    purpose: facts.purpose,
    login: String(facts.requiresSession),
    caps: encodeCapabilities(facts.capabilities),
    sidebar: String(facts.panels.sidebar),
    end: String(facts.panels.end),
    code: String(facts.panels.code),
  };
}

export function birthSearch(facts: TabBirthFacts): string {
  return new URLSearchParams(birthQuery(facts)).toString();
}

// Dropped, not clamped: a clamped width paints a rail nobody chose (`panels/state.ts`).
function width(raw: string | null, limit: { min: number; max: number }, fallback: number): number {
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= limit.min && value <= limit.max ? value : fallback;
}

export function parseBirth(search: string): TabBirthFacts {
  const params = new URLSearchParams(search);
  return {
    tabId: params.get('tab') ?? '',
    purpose: params.get('purpose') === 'parked' ? 'parked' : 'projects',
    // False where no tab exists (a showroom still, the lab); a real tab cannot omit it, since `TabBirthFacts` requires it (ONL-2780).
    requiresSession: params.get('login') === 'true',
    capabilities: parseCapabilities(params.get('caps')),
    panels: {
      sidebar: width(params.get('sidebar'), PANEL_LIMITS.sidebar, PANEL_DEFAULTS.sidebar),
      end: width(params.get('end'), PANEL_LIMITS.end, PANEL_DEFAULTS.end),
      code: width(params.get('code'), PANEL_LIMITS.code, PANEL_DEFAULTS.code),
    },
  };
}

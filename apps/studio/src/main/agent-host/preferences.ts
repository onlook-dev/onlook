// Resolution is whole-record: a stored record missing `effort` is not refilled from `defaults` (ONL-2183, ONL-2115).

import type { DefaultPatch, EffortLevel, ModelChoice, PermissionMode } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { STORED_HARNESSES } from './harness.js';
import { harnessKey, type SessionHarness } from './sessions.js';

export interface ChatPreference {
  model?: string;
  effort?: EffortLevel;
  /** Additive on a version-2 record, so an older one reads `undefined` and falls back to the backend's own default (ONL-2190). */
  permissionMode?: PermissionMode;
  /** What the user always-allowed in this Project, as a settings `allow` list holds it (ONL-2933). */
  allowRules?: string[];
}

interface PreferencesState {
  byWorkspace: Record<string, ChatPreference>;
  defaults: Partial<Record<SessionHarness, ChatPreference>>;
  catalog: Partial<Record<SessionHarness, ModelChoice[]>>;
}

interface PreferencesStateV1 {
  byWorkspace?: Record<string, ChatPreference>;
  latest?: Partial<Record<SessionHarness, ChatPreference>>;
}

const domain = defineDomain<PreferencesState>({
  name: 'chat-preferences',
  version: 2,
  fallback: () => ({ byWorkspace: {}, defaults: {}, catalog: {} }),
  // Any version but 1 throws so the store quarantines the file instead of guessing its shape.
  migrate: (data, fromVersion) => {
    if (fromVersion !== 1) {
      throw new Error(`chat-preferences: no migration from version ${String(fromVersion)}`);
    }
    const v1 = data as PreferencesStateV1 | null;
    return { byWorkspace: v1?.byWorkspace ?? {}, defaults: v1?.latest ?? {}, catalog: {} };
  },
});

const removedProjects = new Set<string>();

/** A version-matched file skips `migrate`, so a hand-edited shape is normalised here. */
function loaded(): PreferencesState {
  const state = domain.read() as Partial<PreferencesState> | null;
  return {
    byWorkspace: state?.byWorkspace ?? {},
    defaults: state?.defaults ?? {},
    catalog: state?.catalog ?? {},
  };
}

export function preferenceFor(cwd: string, harness: SessionHarness): ChatPreference | undefined {
  return loaded().byWorkspace[harnessKey(cwd, harness)];
}

/** Writes the default as the project's own record, so a later default change never reaches it. */
export function seedPreference(cwd: string, harness: SessionHarness): ChatPreference | undefined {
  if (removedProjects.has(harnessKey(cwd, harness))) return undefined;
  const own = preferenceFor(cwd, harness);
  if (own !== undefined) return own;
  const seed = loaded().defaults[harness];
  if (seed === undefined) return undefined;
  const key = harnessKey(cwd, harness);
  domain.update(() => {
    const current = loaded();
    return { ...current, byWorkspace: { ...current.byWorkspace, [key]: { ...seed } } };
  });
  return { ...seed };
}

export function forgetProjectPreferences(cwd: string): void {
  const state = loaded();
  const byWorkspace = { ...state.byWorkspace };
  let changed = false;
  for (const harness of STORED_HARNESSES) {
    const key = harnessKey(cwd, harness);
    removedProjects.add(key);
    if (byWorkspace[key] !== undefined) {
      delete byWorkspace[key];
      changed = true;
    }
  }
  if (changed) domain.write({ ...state, byWorkspace });
}

export function reopenProjectPreferences(cwd: string): void {
  for (const harness of STORED_HARNESSES) {
    removedProjects.delete(`${cwd}::${harness}`);
    removedProjects.delete(harnessKey(cwd, harness));
  }
}

function remember(
  cwd: string,
  harness: SessionHarness,
  patch: (current: ChatPreference) => ChatPreference,
): void {
  const key = harnessKey(cwd, harness);
  if (removedProjects.has(key)) return;
  domain.update(() => {
    const state = loaded();
    return {
      ...state,
      byWorkspace: { ...state.byWorkspace, [key]: patch(state.byWorkspace[key] ?? {}) },
    };
  });
}

export function rememberModelChoice(cwd: string, harness: SessionHarness, model: string): void {
  remember(cwd, harness, ({ model: _dropped, ...rest }) =>
    model === 'default' ? rest : { ...rest, model },
  );
}

export function rememberPermissionMode(
  cwd: string,
  harness: SessionHarness,
  mode: PermissionMode,
): void {
  remember(cwd, harness, (current) => ({ ...current, permissionMode: mode }));
}

/** Every spawn carries these in its own settings, so the list is bounded and the newest rule stays. */
const ALLOW_RULE_LIMIT = 100;

/** An always-allow the user gave this Project, so the next session does not ask it again (ONL-2933). */
export function rememberAllowRules(
  cwd: string,
  harness: SessionHarness,
  rules: readonly string[],
): void {
  const added = rules.filter((rule) => rule !== '');
  if (added.length === 0) return;
  const held = preferenceFor(cwd, harness)?.allowRules ?? [];
  if (added.every((rule) => held.includes(rule))) return;
  remember(cwd, harness, (current) => ({
    ...current,
    allowRules: [...new Set([...(current.allowRules ?? []), ...added])].slice(-ALLOW_RULE_LIMIT),
  }));
}

/** Taking back every always-allow this Project holds; the rules are not a surface the user can read, so there is nothing to pick from (ONL-2933). */
export function forgetAllowRules(cwd: string, harness: SessionHarness): void {
  if (preferenceFor(cwd, harness)?.allowRules === undefined) return;
  remember(cwd, harness, ({ allowRules: _dropped, ...rest }) => rest);
}

/** The record's type lies about a hand-edited file, and one malformed rule would sink the whole settings block (ONL-2933). */
export function usableAllowRules(held: readonly unknown[] | undefined): string[] {
  if (!Array.isArray(held)) return [];
  return held
    .filter((rule): rule is string => typeof rule === 'string' && rule !== '')
    .slice(-ALLOW_RULE_LIMIT);
}

export function rememberEffortChoice(
  cwd: string,
  harness: SessionHarness,
  effort: EffortLevel | null,
): void {
  remember(cwd, harness, ({ effort: _dropped, ...rest }) =>
    effort === null ? rest : { ...rest, effort },
  );
}

function patched(current: ChatPreference, patch: DefaultPatch): ChatPreference {
  const next: ChatPreference = { ...current };
  if (patch.model === null) delete next.model;
  else if (patch.model !== undefined) next.model = patch.model;
  if (patch.effort === null) delete next.effort;
  else if (patch.effort !== undefined) next.effort = patch.effort;
  return next;
}

export function defaultPreference(harness: SessionHarness): ChatPreference {
  return { ...loaded().defaults[harness] };
}

export function rememberDefault(harness: SessionHarness, patch: DefaultPatch): boolean {
  // An absent record still writes: the empty record is what `seedPreference` reads as "has a default".
  const held = loaded().defaults[harness];
  if (held !== undefined && JSON.stringify(held) === JSON.stringify(patched(held, patch))) {
    return false;
  }
  domain.update(() => {
    const state = loaded();
    return {
      ...state,
      defaults: { ...state.defaults, [harness]: patched(state.defaults[harness] ?? {}, patch) },
    };
  });
  return true;
}

export function catalogFor(harness: SessionHarness): ModelChoice[] {
  return loaded().catalog[harness] ?? [];
}

/** Replaces, never merges: a catalog that only grows outlives its models. */
export function rememberCatalog(harness: SessionHarness, models: ModelChoice[]): boolean {
  const current = loaded().catalog[harness];
  if (current !== undefined && JSON.stringify(current) === JSON.stringify(models)) return false;
  domain.update(() => {
    const state = loaded();
    return { ...state, catalog: { ...state.catalog, [harness]: models } };
  });
  return true;
}

export function resetPreferencesCache(): void {
  domain.reset();
  removedProjects.clear();
}

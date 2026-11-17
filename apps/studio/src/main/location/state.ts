import {
  HOME_ACTIVE,
  isRecord,
  type LaunchLocation,
  type StudioLocation,
  type StudioLocationRecord,
  type TabRecord,
  type WindowActive,
  type WindowRecord,
} from '@studio/events';
import { pathSpellings } from '../lib/canonical-path.js';
import { defineDomain } from '../state/store.js';

const empty = (): StudioLocationRecord => ({ current: { kind: 'projects' }, windows: [] });
const removedProjects = new Set<string>();

function location(value: unknown): StudioLocation {
  if (!isRecord(value)) return { kind: 'projects' };
  if (value['kind'] === 'project' && typeof value['repoIdentity'] === 'string') {
    const path = value['workspacePath'];
    return {
      kind: 'project',
      repoIdentity: value['repoIdentity'],
      ...(typeof path === 'string' ? { workspacePath: path } : {}),
    };
  }
  return { kind: 'projects' };
}

function tabs(value: unknown): TabRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const { workspacePath, repoIdentity } = entry;
    if (typeof workspacePath !== 'string' || typeof repoIdentity !== 'string') return [];
    if (workspacePath === '' || repoIdentity === '') return [];
    return [{ workspacePath, repoIdentity }];
  });
}

// Not cross-checked against `tabs`: an active project that is not a member is the home case, not corruption.
function active(value: unknown): WindowActive {
  if (!isRecord(value)) return HOME_ACTIVE;
  if (value['kind'] === 'tab' && typeof value['workspacePath'] === 'string' && value['workspacePath'] !== '') {
    return { kind: 'tab', workspacePath: value['workspacePath'] };
  }
  return HOME_ACTIVE;
}

function windows(value: unknown): WindowRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const window = isRecord(entry) ? entry : {};
    return { tabs: tabs(window['tabs']), active: active(window['active']) };
  });
}

function sanitize(value: unknown): StudioLocationRecord {
  if (!isRecord(value)) return empty();
  return { current: location(value['current']), windows: windows(value['windows']) };
}

function projectWasRemoved(workspacePath: string | undefined): boolean {
  return workspacePath !== undefined && pathSpellings(workspacePath).some((spelling) => removedProjects.has(spelling));
}

function withoutRemovedProjects(record: StudioLocationRecord): StudioLocationRecord {
  if (removedProjects.size === 0) return record;
  return {
    current: record.current.kind === 'project' && projectWasRemoved(record.current.workspacePath)
      ? { kind: 'projects' }
      : record.current,
    windows: record.windows.map((window) => ({
      tabs: window.tabs.filter((tab) => !projectWasRemoved(tab.workspacePath)),
      active: window.active.kind === 'tab' && projectWasRemoved(window.active.workspacePath)
        ? HOME_ACTIVE
        : window.active,
    })),
  };
}

const domain = defineDomain<StudioLocationRecord>({
  name: 'location',
  version: 2,
  fallback: empty,
  // Sanitized, never spread: an unguarded shape written back throws on every later read (ONL-2208).
  migrate: (data, from) => {
    if (from !== 1) throw new Error(`no migration from version ${String(from)}`);
    if (!isRecord(data) || typeof data['kind'] !== 'string') {
      throw new Error('a v1 location with no kind is not ours');
    }
    return { current: location(data), windows: [] };
  },
  // The record moves on every open, close, activate and reorder (ONL-2208).
  debounceMs: 400,
});

/** @parked ONL-2090 */
export function setLocation(next: StudioLocation): void {
  domain.update((current) => withoutRemovedProjects({ ...sanitize(current), current: next }));
}

// Always the projects view; the window's tabs restore beside it, they do not replace it (ONL-2090, ONL-2208).
export function launchLocation(): LaunchLocation {
  return { kind: 'projects' };
}

export function readWindows(): WindowRecord[] {
  return sanitize(domain.read()).windows;
}

export function writeWindows(next: readonly WindowRecord[]): void {
  domain.update((current) => withoutRemovedProjects({ ...sanitize(current), windows: windows(next) }));
}

export function forgetProjectLocation(cwd: string, spellings = pathSpellings(cwd)): void {
  for (const spelling of spellings) removedProjects.add(spelling);
  domain.update((current) => withoutRemovedProjects(sanitize(current)));
  domain.flush();
}

export function reopenProjectLocation(cwd: string): void {
  for (const spelling of pathSpellings(cwd)) removedProjects.delete(spelling);
}

export function flushLocation(): void {
  domain.flush();
}

export function resetLocationCache(): void {
  domain.reset();
  removedProjects.clear();
}

import { projectKey, type ProjectKey } from './key.js';

export interface ProjectStateOptions<T> {
  /** `true` when an entry lives exactly as long as a Tab shows the Project. Left out, the owner removes its own entries at its own moment. */
  readonly closes?: true;
  /** Runs on an entry the registry drops, never on one its owner deletes. */
  readonly dispose?: (value: T, key: ProjectKey) => void;
}

interface Held {
  readonly closes: boolean;
  has(key: ProjectKey): boolean;
  drop(key: ProjectKey): void;
}

/** Every collection in main that holds state for an open Project, by name. A second collection under one name replaces the first. */
const held = new Map<string, Held>();

/** A map of per-Project state, keyed by `ProjectKey` so two spellings of one worktree are one entry. */
export function projectMap<T>(name: string, options: ProjectStateOptions<T> = {}): Map<ProjectKey, T> {
  const map = new Map<ProjectKey, T>();
  held.set(name, {
    closes: options.closes === true,
    has: (key) => map.has(key),
    drop: (key) => {
      const value = map.get(key);
      if (value === undefined || !map.delete(key)) return;
      options.dispose?.(value, key);
    },
  });
  return map;
}

/** The same for a flag per Project. */
export function projectSet(name: string, options: Pick<ProjectStateOptions<never>, 'closes'> = {}): Set<ProjectKey> {
  const set = new Set<ProjectKey>();
  held.set(name, { closes: options.closes === true, has: (key) => set.has(key), drop: (key) => { set.delete(key); } });
  return set;
}

/** The last Tab on a Project closed: every collection declared `closes` lets go of it, here and nowhere else. */
export function closeProjectState(worktree: string): void {
  const key = projectKey(worktree);
  for (const state of held.values()) if (state.closes) state.drop(key);
}

/** The names of the collections still holding something for a Project. */
export function projectStateHeld(worktree: string): string[] {
  const key = projectKey(worktree);
  return [...held].filter(([, state]) => state.has(key)).map(([name]) => name).sort();
}

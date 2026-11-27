import { FLAGS, RENDERER_FLAGS, type FlagKey, type StudioFlags } from '@studio/events';
import { devSwitches } from '../env/dev-switches.js';

export { FLAGS, type FlagKey };
export type FlagResolver = (key: FlagKey) => boolean | undefined;

let remote: Partial<Record<FlagKey, boolean>> | undefined;

export function primeFlags(resolver: FlagResolver | undefined): void {
  if (remote !== undefined) return;
  remote = {};
  if (resolver === undefined) return;
  for (const key of Object.keys(FLAGS) as FlagKey[]) {
    try {
      const value = resolver(key);
      if (typeof value === 'boolean') remote[key] = value;
    } catch {
      continue;
    }
  }
}

/** Every flag as this launch resolves it, `undefined` until `primeFlags` has run (ONL-2901). */
export function flagSnapshot(): Record<FlagKey, boolean> | undefined {
  if (remote === undefined) return undefined;
  return Object.fromEntries((Object.keys(FLAGS) as FlagKey[]).map((key) => [key, flagOn(key)])) as Record<FlagKey, boolean>;
}

export function resetFlagsForTesting(): void {
  remote = undefined;
}

// `STUDIO_FLAGS` forces flags at runtime, `key` on and `-key` off, off winning; builds can enable defaults with `STUDIO_FLAG_DEFAULTS`.
export function flagOn(key: FlagKey): boolean {
  const forced = (devSwitches.flags ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (forced.includes(`-${key}`)) return false;
  const baked = (import.meta.env?.MAIN_VITE_FLAG_DEFAULTS ?? '').split(',');
  return forced.includes(key) || (remote?.[key] ?? (baked.includes(key) || FLAGS[key].default));
}

// A flag answered under a name of its own is left out while off, so the payload a build without it sends is unchanged.
export function rendererFlags(): StudioFlags {
  return Object.fromEntries(RENDERER_FLAGS.filter(([key, name]) => name === key || flagOn(key)).map(([key, name]) => [name, flagOn(key)])) as StudioFlags;
}

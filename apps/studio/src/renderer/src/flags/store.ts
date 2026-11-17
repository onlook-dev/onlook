import { create } from 'zustand';
import { RENDERER_FLAGS, type StudioFlags } from '@studio/events';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

/** Off until main answers, so a refused or slow read never flashes a flagged surface on a build that has it off. */
const OFF = Object.fromEntries(RENDERER_FLAGS.map(([, name]) => [name, false])) as StudioFlags;

const useFlagsStore = create<StudioFlags>()(() => OFF);

let priming: Promise<void> | undefined;

export function primeFlags(): Promise<void> {
  priming ??= (async () => {
    /* A refusal leaves every flag off, so the log line is the only sign a build meant to have one on does not. */
    const flags = await studio().appFlags().catch((error: unknown): StudioFlags | undefined => {
      ignoreRefusal('flags', 'appFlags')(error);
      return undefined;
    });
    if (flags !== undefined) useFlagsStore.setState(flags);
  })();
  return priming;
}

/** Stands in for main's answer where there is no main: a Showroom gallery, a unit test. */
export function seedFlags(flags: Partial<StudioFlags> = {}): void {
  priming = undefined;
  useFlagsStore.setState({ ...OFF, ...flags });
}

export function useFlag(key: keyof StudioFlags): boolean {
  return useFlagsStore((state) => state[key] === true);
}

/** For code outside a component; a surface reads `useFlag` so a late answer re-renders it. */
export function flagEnabled(key: keyof StudioFlags): boolean {
  return useFlagsStore.getState()[key] === true;
}

/** For what a late answer has to redo: a document that arrived first was read against the defaults (ONL-2661). */
export function onFlagsAnswered(listener: () => void): () => void {
  return useFlagsStore.subscribe(listener);
}

// Boot seed and write sink, not the render source: `App.tsx` renders from `useResizable`, and driving it from a subscription loops (ONL-1953).

import { create } from 'zustand';
import { flushSync } from 'react-dom';
import { PANEL_DEFAULTS, type PanelsState } from '@studio/events';
import { BIRTH_PANELS } from '../tabIdentity.js';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

interface PanelsStore extends PanelsState {
  setWidth: (panel: keyof PanelsState, size: number) => void;
}

const SAVE_DEBOUNCE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** The widths that moved since the last save. Only these are sent, so a drag of one panel cannot carry — and overwrite — another's (ONL-2563). */
let moved: Partial<PanelsState> = {};

function sendMoved(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  if (Object.keys(moved).length === 0) return;
  const next = moved;
  moved = {};
  void studio().panelsSave(next);
}

function scheduleSave(panel: keyof PanelsState): void {
  moved[panel] = usePanelsStore.getState()[panel];
  clearTimeout(saveTimer);
  saveTimer = setTimeout(sendMoved, SAVE_DEBOUNCE_MS);
}

/** The one owner of the widths' order: a single `panels:changed` seat begun before the first read, and a count of what is newer than a read in flight. */
const widths: { stop?: () => void; newer: number; followers: Set<(state: PanelsState) => void> } = { newer: 0, followers: new Set() };

function listen(): void {
  widths.stop ??= studio().onPanelsChanged((state) => {
    widths.newer += 1;
    flushSync(() => {
      usePanelsStore.setState({ sidebar: state.sidebar, end: state.end, code: state.code });
      for (const follow of widths.followers) follow(state);
    });
  });
}

/* A drag's release sends at once, so another Tab hears the width before the tab strip can be reached (ONL-2744). */
if (typeof window !== 'undefined') window.addEventListener('pointerup', sendMoved, { capture: true });

const usePanelsStore = create<PanelsStore>()((set, get) => ({
  ...BIRTH_PANELS,
  setWidth: (panel, size) => {
    // The hook fires per pointermove past a clamp bound; without this the save timer never settles.
    if (get()[panel] === size) return;
    // A computed key widens to `Record<string, number>`, which a branch per panel only hides.
    set({ [panel]: size } as Partial<PanelsState>);
    widths.newer += 1;
    scheduleSave(panel);
  },
}));

export { usePanelsStore };


export function primePanels(): Promise<void> {
  return (async () => {
    listen();
    const asked = widths.newer;
    const state = await studio().panelsState().catch(ignoreRefusal('panels', 'state read'));
    if (state === undefined || asked !== widths.newer) return;
    usePanelsStore.setState({ sidebar: state.sidebar, end: state.end, code: state.code });
  })();
}

/** Another Tab's widths: taken without a save, since main already holds them (ONL-2593). */
export function subscribeToPanelWidths(onChange?: (state: PanelsState) => void): () => void {
  listen();
  if (onChange === undefined) return () => {};
  widths.followers.add(onChange);
  return () => {
    widths.followers.delete(onChange);
  };
}

export function resetPanelsStoreForTesting(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  moved = {};
  widths.stop?.();
  widths.stop = undefined;
  widths.newer = 0;
  widths.followers.clear();
  usePanelsStore.setState({ ...PANEL_DEFAULTS });
}

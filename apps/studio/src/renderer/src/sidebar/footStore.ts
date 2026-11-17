import { create } from 'zustand';

/** The Left Rail foot's drawn height, 0 while it shows nothing; the canvas corner's pill stacks above it. */
export const useLeftPanelFootStore = create<{ footPx: number }>()(() => ({ footPx: 0 }));

export function setLeftPanelFootPx(footPx: number): void {
  if (useLeftPanelFootStore.getState().footPx !== footPx) useLeftPanelFootStore.setState({ footPx });
}

/** Next-task cards in the chat that the person can still tap, read off the transcript the chat holds (ONL-2960). */
export const useNextTasksOfferStore = create<{ isOpen: boolean }>()(() => ({ isOpen: false }));

export function setNextTasksOffered(isOpen: boolean): void {
  if (useNextTasksOfferStore.getState().isOpen !== isOpen) useNextTasksOfferStore.setState({ isOpen });
}

/** How long the Tips pill sits alone in the foot once a project opens, before the first tip may grow out of it (ONL-2960). */
export const TIP_OPENING_BEAT_MS = 5_000;

/** How long the foot rests after each tip goes, before the next may grow (ONL-2960). */
export const TIP_BEAT_MS = 6_000;

/** Per Project path: once over, a beat runs again only in a new tip moment (ONL-2960). */
export const useTipBeatStore = create<{ over: Record<string, true> }>()(() => ({ over: {} }));

const beats = new Map<string, ReturnType<typeof setTimeout>>();

export function startTipBeat(path: string, delayMs: number): void {
  if (useTipBeatStore.getState().over[path] === true || beats.has(path)) return;
  beats.set(
    path,
    setTimeout(() => {
      beats.delete(path);
      useTipBeatStore.setState((state) => ({ over: { ...state.over, [path]: true } }));
    }, delayMs),
  );
}

/** A tip that goes away starts the beat over, so the next one never follows straight on (ONL-2960). */
export function restartTipBeat(path: string, delayMs: number): void {
  forgetTipBeat(path);
  startTipBeat(path, delayMs);
}

export function forgetTipBeat(path: string): void {
  const beat = beats.get(path);
  if (beat !== undefined) clearTimeout(beat);
  beats.delete(path);
  if (useTipBeatStore.getState().over[path] !== true) return;
  useTipBeatStore.setState((state) => {
    const { [path]: _over, ...over } = state.over;
    return { over };
  });
}

export function resetTipBeats(): void {
  for (const beat of beats.values()) clearTimeout(beat);
  beats.clear();
  useTipBeatStore.setState({ over: {} });
}

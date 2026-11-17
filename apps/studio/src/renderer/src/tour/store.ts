import { create } from 'zustand';
import type { TourOpenSource } from '@studio/events';

/** A reopen from Tips or Help. First run opens the tour from the saved setting instead. */
export const useTourStore = create<{ reopenedFrom: TourOpenSource | null }>()(() => ({ reopenedFrom: null }));

export function openTour(source: Exclude<TourOpenSource, 'first_run'>): void {
  useTourStore.setState({ reopenedFrom: source });
}

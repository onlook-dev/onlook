import { useEffect } from 'react';
import { useSettingsStore } from '../settings/store.js';
import { telemetryProjectFields } from '../workspace/store.js';
import { TourDialog } from './TourDialog.js';
import { useTourStore } from './store.js';
import { studio } from '../bridge.js';

/**
 * Opens the tour once, on the first launch after settings load, and again whenever Tips or Help asks.
 * Mounted only while open: the dialog keeps its children alive when closed, and the scene
 * must build and paint at its real size.
 */
export function TourHost(): React.JSX.Element | null {
  const isFirstRun = useSettingsStore((state) => state.isPrimed && !state.tourSeen);
  const reopenedFrom = useTourStore((state) => state.reopenedFrom);
  const source = reopenedFrom ?? (isFirstRun ? 'first_run' : null);

  useEffect(() => {
    if (source === null) return;
    studio().telemetryEvent({ event: 'tour_opened', properties: { ...telemetryProjectFields(), source } });
  }, [source]);

  if (source === null) return null;
  return (
    <TourDialog
      isOpen
      onClose={({ step, completed }) => {
        studio().telemetryEvent({ event: 'tour_closed', properties: { ...telemetryProjectFields(), step, completed } });
        useTourStore.setState({ reopenedFrom: null });
        if (isFirstRun) void useSettingsStore.getState().markTourSeen();
      }}
    />
  );
}

import { framePointedUrls } from '../canvas/model.js';
import { useCanvasStore } from '../canvas/store.js';
import { hasLiveEntry, useServerStore } from '../server/store.js';
import { ProjectSetupBody } from './ProjectSetupPanel.js';
import { reportProjectRunIntent } from './runControl.js';
import { askProjectSetup, selectProjectSetupReadFailed, selectProjectSetupSnapshot, useProjectSetupStore } from './store.js';

/** Reads the stores at press time, as the canvas run control does, so a stale render cannot send a stale intent. */
function onRun(press: 'start' | 'stop'): void {
  if (press === 'stop') useServerStore.getState().markStopPressed();
  reportProjectRunIntent(press === 'stop', true,
    useServerStore.getState().entries, framePointedUrls(useCanvasStore.getState().nodes));
}

export function ProjectSetupSection(): React.JSX.Element {
  const snapshot = useProjectSetupStore(selectProjectSetupSnapshot);
  const readFailed = useProjectSetupStore(selectProjectSetupReadFailed);
  const ask = useProjectSetupStore((state) => state.ask);
  const isServerLive = useServerStore((state) => hasLiveEntry(state.entries));
  return <ProjectSetupBody snapshot={snapshot} readFailed={readFailed} ask={ask} isServerLive={isServerLive}
    onRun={onRun} onAsk={() => { void askProjectSetup(); }} />;
}

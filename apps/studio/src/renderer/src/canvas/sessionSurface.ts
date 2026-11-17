import type { SessionSurfaces } from '../workspace/session.js';
import { resyncCanvas } from './connect.js';
import { frameFlowNodes } from './model.js';
import { useCanvasStore } from './store.js';
import { beginCanvasSwitch } from './wire.js';

/** The canvas's half of what a project session moves; the entry adds the code store's. */
export const canvasSessionSurface: Omit<SessionSurfaces, 'clearCode'> = {
  clearFrames: () => {
    useCanvasStore.getState().clearFrames();
  },
  seedCamera: (camera, pageId) => {
    useCanvasStore.getState().seedCamera(camera, pageId);
  },
  showProject: (project) => {
    useCanvasStore.getState().setProject(project);
  },
  resync: resyncCanvas,
  latchResync: beginCanvasSwitch,
  homeUrl: () => frameFlowNodes(useCanvasStore.getState().nodes)[0]?.data.homeUrl,
};

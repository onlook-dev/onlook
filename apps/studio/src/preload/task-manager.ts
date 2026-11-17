import { contextBridge } from 'electron';
import type { StudioTaskManagerBridge } from '@studio/events';
import { bridgeFor } from './bridge.js';
import { rendererIpc } from './listen.js';
import { exposeLocale } from './locale.js';
import { windowControlsFor } from './window-controls.js';

const studioTaskManager: StudioTaskManagerBridge = {
  ...bridgeFor('taskManager', rendererIpc, { diagnostics: false }),
  windowControls: windowControlsFor(process.platform),
};

contextBridge.exposeInMainWorld('studioTaskManager', studioTaskManager);
exposeLocale();

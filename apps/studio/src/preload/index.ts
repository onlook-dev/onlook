import { contextBridge } from 'electron';
import { DIAGNOSTICS_ARG, type StudioBridge } from '@studio/events';
import { bridgeFor } from './bridge.js';
import { rendererIpc } from './listen.js';
import { exposeLocale } from './locale.js';
import { windowControlsFor } from './window-controls.js';

const bridge: StudioBridge = {
  ...bridgeFor('tab', rendererIpc, { diagnostics: process.argv.includes(DIAGNOSTICS_ARG) }),
  windowControls: windowControlsFor(process.platform),
};

contextBridge.exposeInMainWorld('studio', bridge);
exposeLocale();

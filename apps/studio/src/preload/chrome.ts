import { contextBridge } from 'electron';
import { DIAGNOSTICS_ARG, type StudioChromeBridge } from '@studio/events';
import { bridgeFor } from './bridge.js';
import { rendererIpc } from './listen.js';
import { exposeLocale } from './locale.js';
import { windowControlsFor } from './window-controls.js';

// The chrome view owns no project, session or workspace; a `window.studio` capability exposed here reaches every tab (ONL-2206).
const studioChrome: StudioChromeBridge = {
  // Main decides the gate (`main/diagnostics/gate.ts`) and says so in argv; a shipped build exposes nothing (ONL-2371, ONL-2377).
  ...bridgeFor('chrome', rendererIpc, { diagnostics: process.argv.includes(DIAGNOSTICS_ARG) }),
  windowControls: windowControlsFor(process.platform),
};

contextBridge.exposeInMainWorld('studioChrome', studioChrome);
exposeLocale();

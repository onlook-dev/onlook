import { ipcRenderer } from 'electron';
import type { BridgeTransport } from './bridge.js';

function subscribe(channel: string, listener: (payload: unknown) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
    listener(payload);
  };
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.off(channel, handler);
  };
}

export const rendererIpc: BridgeTransport = {
  invoke: (channel, ...payload) => ipcRenderer.invoke(channel, ...payload),
  send: (channel, ...payload) => ipcRenderer.send(channel, ...payload),
  subscribe,
};

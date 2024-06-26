import { contextBridge, ipcRenderer } from 'electron';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}

// Expose methods to renderer process
const api = {
  sendMessage: (message: string) => {
    ipcRenderer.send('message', message);
  },
  // Provide an easier way to listen to events
  on: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.on(channel, (_, data) => callback(data));
  }
};

contextBridge.exposeInMainWorld('Main', api);
// WARN: Using the ipcRenderer directly in the browser through the contextBridge is insecure
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);

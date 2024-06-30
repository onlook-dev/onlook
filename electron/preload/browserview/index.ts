import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
import { MainChannels } from '/common/constants';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}

const store = {
  get(val: any) {
    return ipcRenderer.sendSync('electron-store-get', val);
  },
  set(property: string, val: any) {
    ipcRenderer.send('electron-store-set', property, val);
  },
  has(val: any) {
    return ipcRenderer.sendSync('electron-store-has', val);
  }
}

const api = {
  store: store,

  sendMessage<T>(channel: MainChannels, args: T[]) {
    ipcRenderer.send(channel, args);
  },

  on<T>(channel: MainChannels, func: (...args: T[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: T[]) =>
      func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  once<T>(channel: MainChannels, func: (...args: T[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },

  invoke<T, P>(channel: MainChannels, ...args: T[]): Promise<P> {
    return ipcRenderer.invoke(channel, ...args);
  },

  removeListener<T>(channel: MainChannels, listener: (...args: T[]) => void) {
    ipcRenderer.removeListener(channel, listener as (event: Electron.IpcRendererEvent, ...args: any[]) => void);
  },

  removeAllListeners(channel: MainChannels) {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('Main', api);
// WARN: Using the ipcRenderer directly in the browser through the contextBridge is insecure
// contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);

import type { Channels } from '@onlook/models/constants';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer, webFrame } from 'electron';

declare global {
    interface Window {
        api: typeof api;
        env: typeof env;
        store: typeof store;
    }
}

const env = {
    WEBVIEW_PRELOAD_PATH: process.env.WEBVIEW_PRELOAD_PATH,
    APP_VERSION: process.env.APP_VERSION,
    IS_DEV: process.env.NODE_ENV === 'development',
    PLATFORM: process.platform,
};

const store = {
    get(val: any) {
        return ipcRenderer.sendSync('electron-store-get', val);
    },
    set(property: string, val: any) {
        ipcRenderer.send('electron-store-set', property, val);
    },
    has(val: any) {
        return ipcRenderer.sendSync('electron-store-has', val);
    },
};

const api = {
    send<T>(channel: Channels, args: T) {
        ipcRenderer.send(channel, args);
    },

    on<T>(channel: Channels, func: (...args: T[]) => void) {
        const subscription = (_event: IpcRendererEvent, ...args: T[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },

    once<T>(channel: Channels, func: (...args: T[]) => void) {
        ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },

    invoke<T, P>(channel: Channels, ...args: T[]): Promise<P> {
        return ipcRenderer.invoke(channel, ...args);
    },

    removeListener<T>(channel: Channels, listener: (...args: T[]) => void) {
        ipcRenderer.removeListener(
            channel,
            listener as (event: Electron.IpcRendererEvent, ...args: any[]) => void,
        );
    },

    removeAllListeners(channel: Channels) {
        ipcRenderer.removeAllListeners(channel);
    },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', store);
contextBridge.exposeInMainWorld('env', env);
contextBridge.exposeInMainWorld('process', process);

// Set zoom level
webFrame.setZoomFactor(1);
webFrame.setVisualZoomLevelLimits(1, 1);

import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
import { MainChannels } from '/common/constants';

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
    send<T>(channel: MainChannels, args: T) {
        ipcRenderer.send(channel, args);
    },

    on<T>(channel: MainChannels, func: (...args: T[]) => void) {
        const subscription = (_event: IpcRendererEvent, ...args: T[]) => func(...args);
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
        ipcRenderer.removeListener(
            channel,
            listener as (event: Electron.IpcRendererEvent, ...args: any[]) => void,
        );
    },

    removeAllListeners(channel: MainChannels) {
        ipcRenderer.removeAllListeners(channel);
    },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', store);
contextBridge.exposeInMainWorld('env', env);
contextBridge.exposeInMainWorld('process', process);

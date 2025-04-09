import { MainChannels } from '@onlook/models/constants';
import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron';

export function onOnlookViewCode(callback: (data: any) => void) {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(MainChannels.VIEW_CODE_IN_ONLOOK, subscription);
    return () => ipcRenderer.removeListener(MainChannels.VIEW_CODE_IN_ONLOOK, subscription);
}

export function removeOnlookViewCode(callback: (data: any) => void) {
    ipcRenderer.removeListener(
        MainChannels.VIEW_CODE_IN_ONLOOK,
        callback as (event: IpcRendererEvent, ...args: any[]) => void,
    );
}

export function viewCodeInOnlook(args: any) {
    return ipcRenderer.invoke(MainChannels.VIEW_CODE_IN_ONLOOK, args);
}

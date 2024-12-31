import { MainChannels } from '@onlook/models/constants';
import type { AppState, UserSettings } from '@onlook/models/settings';
import { ipcMain } from 'electron';
import { PersistentStorage } from '../storage';

export function listenForStorageMessages() {
    ipcMain.handle(MainChannels.GET_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.USER_SETTINGS.read();
    });

    ipcMain.handle(
        MainChannels.UPDATE_USER_SETTINGS,
        (e: Electron.IpcMainInvokeEvent, args: UserSettings) => {
            PersistentStorage.USER_SETTINGS.update(args);
        },
    );

    ipcMain.handle(MainChannels.GET_USER_METADATA, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.USER_METADATA.read();
    });

    ipcMain.handle(MainChannels.GET_APP_STATE, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.APP_STATE.read();
    });

    ipcMain.handle(
        MainChannels.REPLACE_APP_STATE,
        (e: Electron.IpcMainInvokeEvent, args: AppState) => {
            PersistentStorage.APP_STATE.replace(args);
        },
    );

    ipcMain.handle(MainChannels.GET_PROJECTS, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.PROJECTS.read();
    });

    ipcMain.handle(MainChannels.UPDATE_PROJECTS, (e: Electron.IpcMainInvokeEvent, args: any) => {
        PersistentStorage.PROJECTS.update(args);
    });
}

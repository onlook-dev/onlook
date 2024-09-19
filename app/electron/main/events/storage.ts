import { ipcMain } from 'electron';
import { PersistentStorage, StorageType } from '../storage';
import { MainChannels } from '/common/constants';
import { AppState, ProjectSettings, UserSettings } from '/common/models/settings';

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

    ipcMain.handle(MainChannels.GET_PROJECT_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.PROJECT_SETTINGS.read();
    });

    ipcMain.handle(
        MainChannels.UPDATE_PROJECT_SETTINGS,
        (e: Electron.IpcMainInvokeEvent, args: ProjectSettings) => {
            PersistentStorage.PROJECT_SETTINGS.update(args);
        },
    );

    ipcMain.handle(MainChannels.GET_USER_METADATA, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.USER_METADATA.read();
    });

    ipcMain.handle(MainChannels.GET_APP_STATE, (e: Electron.IpcMainInvokeEvent) => {
        return PersistentStorage.APP_STATE.read();
    });

    ipcMain.handle(
        MainChannels.UPDATE_APP_STATE,
        (e: Electron.IpcMainInvokeEvent, args: AppState) => {
            PersistentStorage.APP_STATE.update(args);
        },
    );

    ipcMain.handle(
        MainChannels.GET_STORAGE_OBJECT,
        (e: Electron.IpcMainInvokeEvent, args: StorageType) => {
            return PersistentStorage.getStorageByType(args).read();
        },
    );

    ipcMain.handle(
        MainChannels.UPDATE_STORAGE_OBJECT,
        (e: Electron.IpcMainInvokeEvent, args: { type: StorageType; value: any }) => {
            PersistentStorage.getStorageByType(args.type).update(args.value);
        },
    );
}

import { ipcMain } from 'electron';
import { PersistentStorage } from '../storage';
import { MainChannels } from '/common/constants';
import { ProjectSettings, UserSettings } from '/common/models/settings';

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
}

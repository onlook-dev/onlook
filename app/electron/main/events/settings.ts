import { ipcMain } from 'electron';
import { PersistenStorage } from '../storage';
import { MainChannels } from '/common/constants';
import { ProjectSettings, UserSettings } from '/common/models/settings';

export function listenForSettingMessages() {
    ipcMain.handle(MainChannels.GET_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return PersistenStorage.USER_SETTINGS.read();
    });

    ipcMain.handle(
        MainChannels.UPDATE_USER_SETTINGS,
        (e: Electron.IpcMainInvokeEvent, args: UserSettings) => {
            PersistenStorage.USER_SETTINGS.update(args);
        },
    );

    ipcMain.handle(MainChannels.GET_PROJECT_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return PersistenStorage.PROJECT_SETTINGS.read();
    });

    ipcMain.handle(
        MainChannels.UPDATE_PROJECT_SETTINGS,
        (e: Electron.IpcMainInvokeEvent, args: ProjectSettings) => {
            PersistenStorage.PROJECT_SETTINGS.update(args);
        },
    );
}

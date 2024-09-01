import { ipcMain } from 'electron';
import { readUserSettings, updateUserSettings } from '../storage';
import { MainChannels } from '/common/constants';

export function listenForSettingMessages() {
    ipcMain.handle(MainChannels.GET_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return readUserSettings();
    });

    ipcMain.handle(MainChannels.UPDATE_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent, args) => {
        updateUserSettings(args);
    });
}

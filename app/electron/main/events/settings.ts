import { ipcMain } from 'electron';
import { PersistenStorage } from '../storage';
import { MainChannels } from '/common/constants';

export function listenForSettingMessages() {
    ipcMain.handle(MainChannels.GET_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return PersistenStorage.USER_SETTINGS.read();
    });

    ipcMain.handle(MainChannels.UPDATE_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent, args) => {
        PersistenStorage.USER_SETTINGS.update(args);
    });
}

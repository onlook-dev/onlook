import { ipcMain } from 'electron';
import { readUserSettings } from '../storage';
import { listenForAnalyticsMessages } from './analytics';
import { listenForCodeMessages } from './code';
import { listenForTunnelMessages } from './tunnel';
import { MainChannels } from '/common/constants';

export function listenForIpcMessages() {
    listenForTunnelMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForSettingMessages();
}

function listenForSettingMessages() {
    ipcMain.handle(MainChannels.GET_USER_SETTINGS, (e: Electron.IpcMainInvokeEvent) => {
        return readUserSettings();
    });
}

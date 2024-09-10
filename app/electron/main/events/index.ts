import { ipcMain, shell } from 'electron';
import { listenForAnalyticsMessages } from './analytics';
import { listenForCodeMessages } from './code';
import { listenForSettingMessages } from './settings';
import { listenForTunnelMessages } from './tunnel';
import { MainChannels } from '/common/constants';

export function listenForIpcMessages() {
    listenForTunnelMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForSettingMessages();
    listenForAuthMessages();
}

function listenForAuthMessages() {
    ipcMain.handle(
        MainChannels.OPEN_EXTERNAL_WINDOW,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            return shell.openExternal(args);
        },
    );
}

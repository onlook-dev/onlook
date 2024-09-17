import { ipcMain, shell } from 'electron';
import { updater } from '../update';
import { listenForAnalyticsMessages } from './analytics';
import { listenForAuthMessages } from './auth';
import { listenForCodeMessages } from './code';
import { listenForStorageMessages } from './storage';
import { listenForTunnelMessages } from './tunnel';
import { MainChannels } from '/common/constants';

export function listenForIpcMessages() {
    listenForGeneralMessages();
    listenForTunnelMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForStorageMessages();
    listenForAuthMessages();
}

function listenForGeneralMessages() {
    ipcMain.handle(
        MainChannels.OPEN_EXTERNAL_WINDOW,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            return shell.openExternal(args);
        },
    );

    ipcMain.handle(
        MainChannels.QUIT_AND_INSTALL,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            return updater.quitAndInstall();
        },
    );
}

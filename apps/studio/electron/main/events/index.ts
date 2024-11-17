import { MainChannels } from '@onlook/models/constants';
import { WindowCommand } from '@onlook/models/projects';
import { BrowserWindow, ipcMain, shell } from 'electron';
import { mainWindow } from '..';
import { checkSystemRequirements } from '../requirements';
import { imageStorage } from '../storage/images';
import { updater } from '../update';
import { listenForAnalyticsMessages } from './analytics';
import { listenForAuthMessages } from './auth';
import { listenForChatMessages } from './chat';
import { listenForCodeMessages } from './code';
import { listenForCreateMessages } from './create';
import { listenForStorageMessages } from './storage';
import { listenForTerminalMessages } from './terminal';

export function listenForIpcMessages() {
    listenForGeneralMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForStorageMessages();
    listenForAuthMessages();
    listenForCreateMessages();
    listenForChatMessages();
    listenForTerminalMessages();
}

function listenForGeneralMessages() {
    ipcMain.handle(MainChannels.RELOAD_APP, (e: Electron.IpcMainInvokeEvent, args: string) => {
        return mainWindow?.reload();
    });

    ipcMain.handle(MainChannels.CHECK_REQUIREMENTS, () => {
        return checkSystemRequirements();
    });

    ipcMain.handle(
        MainChannels.OPEN_IN_EXPLORER,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            return shell.showItemInFolder(args);
        },
    );

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

    ipcMain.handle(MainChannels.GET_IMAGE, (e: Electron.IpcMainInvokeEvent, args: string) => {
        return imageStorage.readImage(args);
    });

    ipcMain.handle(
        MainChannels.SAVE_IMAGE,
        (e: Electron.IpcMainInvokeEvent, args: { img: string; name: string }) => {
            return imageStorage.writeImage(args.name, args.img);
        },
    );

    ipcMain.handle(
        MainChannels.SEND_WINDOW_COMMAND,
        (e: Electron.IpcMainInvokeEvent, args: string) => {
            const window = BrowserWindow.getFocusedWindow();

            const command = args as WindowCommand;
            switch (command) {
                case WindowCommand.MINIMIZE:
                    window?.minimize();
                    break;
                case WindowCommand.MAXIMIZE:
                    window?.maximize();
                    break;
                case WindowCommand.UNMAXIMIZE:
                    window?.unmaximize();
                    break;
                case WindowCommand.CLOSE:
                    window?.close();
                    break;
            }
        },
    );
}

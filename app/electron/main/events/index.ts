import { BrowserWindow, ipcMain, shell } from 'electron';
import { imageStorage } from '../storage/images';
import { updater } from '../update';
import { listenForAnalyticsMessages } from './analytics';
import { listenForAuthMessages } from './auth';
import { listenForCodeMessages } from './code';
import { listenForCreateMessages } from './create';
import { listenForStorageMessages } from './storage';
import { MainChannels } from '/common/constants';
import { WindowCommand } from '/common/models/project';

export function listenForIpcMessages() {
    listenForGeneralMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForStorageMessages();
    listenForAuthMessages();
    listenForCreateMessages();
}

function listenForGeneralMessages() {
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
                case WindowCommand.CLOSE:
                    window?.close();
                    break;
            }
        },
    );
}

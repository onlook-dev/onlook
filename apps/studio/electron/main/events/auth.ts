import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { mainWindow } from '..';
import analytics from '../analytics';
import { signIn } from '../auth';
import { PersistentStorage } from '../storage';

export function listenForAuthMessages() {
    ipcMain.handle(MainChannels.SIGN_IN, (e: Electron.IpcMainInvokeEvent, args) => {
        signIn(args.provider);
    });

    ipcMain.handle(MainChannels.SIGN_OUT, (e: Electron.IpcMainInvokeEvent, args) => {
        PersistentStorage.USER_METADATA.clear();
        PersistentStorage.AUTH_TOKENS.clear();
        analytics.signOut();
        mainWindow?.webContents.send(MainChannels.USER_SIGNED_OUT);
    });
}

import { ipcMain } from 'electron';
import { mainWindow } from '..';
import analytics from '../analytics';
import { PersistentStorage } from '../storage';
import { MainChannels } from '@onlook/models/constants';

export function listenForAuthMessages() {
    ipcMain.handle(MainChannels.SIGN_OUT, (e: Electron.IpcMainInvokeEvent, args) => {
        PersistentStorage.USER_METADATA.clear();
        PersistentStorage.AUTH_TOKENS.clear();
        analytics.signOut();
        mainWindow?.webContents.send(MainChannels.USER_SIGNED_OUT);
    });
}

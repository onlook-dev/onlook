import { ipcMain } from 'electron';
import { mainWindow } from '..';
import analytics from '../analytics';
import { PersistenStorage } from '../storage';
import { MainChannels } from '/common/constants';

export function listenForAuthMessages() {
    ipcMain.handle(MainChannels.SIGN_OUT, (e: Electron.IpcMainInvokeEvent, args) => {
        PersistenStorage.USER_METADATA.clear();
        PersistenStorage.AUTH_TOKENS.clear();
        analytics.signOut();
        mainWindow?.webContents.send(MainChannels.USER_SIGNED_OUT);
    });
}

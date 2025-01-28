import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { signIn, signOut } from '../auth';

export function listenForAuthMessages() {
    ipcMain.handle(MainChannels.SIGN_IN, (e: Electron.IpcMainInvokeEvent, args) => {
        signIn(args.provider);
    });

    ipcMain.handle(MainChannels.SIGN_OUT, (e: Electron.IpcMainInvokeEvent, args) => {
        signOut();
    });
}

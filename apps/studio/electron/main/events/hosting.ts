import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import hostingManager from '../hosting';

export function listenForHostingMessages() {
    ipcMain.handle(MainChannels.CREATE_HOSTING_ENV, (e: Electron.IpcMainInvokeEvent, args) => {
        console.log('createEnv', args);
    });

    ipcMain.handle(MainChannels.GET_HOSTING_ENV, (e: Electron.IpcMainInvokeEvent, args) => {
        console.log('getEnv', args);
    });

    ipcMain.handle(MainChannels.DEPLOY_VERSION, (e: Electron.IpcMainInvokeEvent, args) => {
        const { envId, folderPath, buildScript } = args;
        return hostingManager.publishEnv(folderPath, buildScript);
    });

    ipcMain.handle(MainChannels.DELETE_HOSTING_ENV, (e: Electron.IpcMainInvokeEvent, args) => {
        console.log('deleteEnv', args);
    });
}

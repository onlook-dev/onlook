import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import hostingManager from '../hosting';

export function listenForHostingMessages() {
    ipcMain.handle(
        MainChannels.CREATE_PROJECT_HOSTING_ENV,
        (e: Electron.IpcMainInvokeEvent, args) => {
            return hostingManager.createEnv(args);
        },
    );

    ipcMain.handle(MainChannels.GET_PROJECT_HOSTING_ENV, (e: Electron.IpcMainInvokeEvent, args) => {
        return hostingManager.getEnv();
    });

    ipcMain.handle(
        MainChannels.PUBLISH_PROJECT_HOSTING_ENV,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { envId, folderPath, buildScript } = args;
            return hostingManager.publishEnv(envId, folderPath, buildScript);
        },
    );
}

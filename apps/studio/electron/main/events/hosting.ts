import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import hostingManager from '../hosting';

export function listenForHostingMessages() {
    ipcMain.handle(MainChannels.START_DEPLOYMENT, async (e: Electron.IpcMainInvokeEvent, args) => {
        const { folderPath, buildScript, urls, skipBuild } = args;
        return await hostingManager.deploy(folderPath, buildScript, urls, skipBuild);
    });

    ipcMain.handle(
        MainChannels.GET_CUSTOM_DOMAINS,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            return await hostingManager.getCustomDomains();
        },
    );

    ipcMain.handle(
        MainChannels.UNPUBLISH_HOSTING_ENV,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            const { urls } = args;
            return await hostingManager.unpublish(urls);
        },
    );
}

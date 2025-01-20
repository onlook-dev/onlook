import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import hostingManager from '../hosting';

export function listenForHostingMessages() {
    ipcMain.handle(MainChannels.START_DEPLOYMENT, async (e: Electron.IpcMainInvokeEvent, args) => {
        const { folderPath, buildScript, url, skipBuild } = args;
        return await hostingManager.deploy(folderPath, buildScript, url, skipBuild);
    });

    ipcMain.handle(
        MainChannels.UNPUBLISH_HOSTING_ENV,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            const { url } = args;
            return await hostingManager.unpublish(url);
        },
    );
}

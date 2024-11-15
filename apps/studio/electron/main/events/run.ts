import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import run from '../run';

export async function listenForRunMessages() {
    ipcMain.handle(MainChannels.RUN_SETUP, (e: Electron.IpcMainInvokeEvent, args) => {
        const { dirPath } = args as { dirPath: string };
        return run.setup(dirPath);
    });

    ipcMain.handle(MainChannels.GET_TEMPLATE_NODE, (e: Electron.IpcMainInvokeEvent, args) => {
        const { id } = args as { id: string };
        return run.getTemplateNode(id);
    });
}

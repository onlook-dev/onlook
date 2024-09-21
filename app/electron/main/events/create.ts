import { ProgressCallback, ProjectCreationStage, createProject } from '@onlook/utils';
import { ipcMain } from 'electron';
import { mainWindow } from '..';
import { MainChannels } from '/common/constants';

export function listenForCreateMessages() {
    ipcMain.handle(MainChannels.CREATE_NEW_PROJECT, (e: Electron.IpcMainInvokeEvent, args) => {
        const progressCallback: ProgressCallback = (
            stage: ProjectCreationStage,
            message: string,
        ) => {
            mainWindow?.webContents.send(MainChannels.CREATE_NEW_PROJECT_CALLBACK, {
                stage,
                message,
            });
        };

        const { name, path } = args as { name: string; path: string };
        return createProject(name, path, progressCallback);
    });
}

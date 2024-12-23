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
        return hostingManager.getEnv(args.envId);
    });

    ipcMain.handle(MainChannels.GET_DEPLOYMENT_STATUS, (e: Electron.IpcMainInvokeEvent, args) => {
        return hostingManager.getDeploymentStatus(args.envId, args.versionId);
    });

    ipcMain.handle(
        MainChannels.DELETE_PROJECT_HOSTING_ENV,
        (e: Electron.IpcMainInvokeEvent, args) => {
            return hostingManager.deleteEnv(args.envId);
        },
    );

    ipcMain.handle(
        MainChannels.PUBLISH_PROJECT_HOSTING_ENV,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { envId, folderPath, buildScript, framework, packageJsonPath } = args;
            return hostingManager.publishEnv(
                envId,
                folderPath,
                buildScript,
                framework,
                packageJsonPath,
            );
        },
    );
}

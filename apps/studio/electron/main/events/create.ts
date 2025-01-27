import {
    type CreateCallback,
    type CreateStage,
    type SetupCallback,
    type SetupStage,
    type VerifyCallback,
    type VerifyStage,
    createProject,
    installProjectDependencies,
    setupProject,
    verifyProject,
} from '@onlook/foundation';
import type { ImageMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { mainWindow } from '..';
import { createProjectPrompt } from '../create';

export function listenForCreateMessages() {
    ipcMain.handle(MainChannels.CREATE_NEW_PROJECT, (e: Electron.IpcMainInvokeEvent, args) => {
        const progressCallback: CreateCallback = (stage: CreateStage, message: string) => {
            mainWindow?.webContents.send(MainChannels.CREATE_NEW_PROJECT_CALLBACK, {
                stage,
                message,
            });
        };

        const { name, path } = args as { name: string; path: string };
        return createProject(name, path, progressCallback);
    });

    ipcMain.handle(MainChannels.VERIFY_PROJECT, (e: Electron.IpcMainInvokeEvent, args: string) => {
        const progressCallback: VerifyCallback = (stage: VerifyStage, message: string) => {
            mainWindow?.webContents.send(MainChannels.VERIFY_PROJECT_CALLBACK, {
                stage,
                message,
            });
        };
        const path = args as string;
        return verifyProject(path, progressCallback);
    });

    ipcMain.handle(
        MainChannels.INSTALL_PROJECT_DEPENDENCIES,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const progressCallback: SetupCallback = (stage: SetupStage, message: string) => {
                mainWindow?.webContents.send(MainChannels.SETUP_PROJECT_CALLBACK, {
                    stage,
                    message,
                });
            };
            const { folderPath, installCommand } = args;
            return installProjectDependencies(folderPath, installCommand, progressCallback);
        },
    );

    ipcMain.handle(MainChannels.SETUP_PROJECT, (e: Electron.IpcMainInvokeEvent, args: string) => {
        const progressCallback: SetupCallback = (stage: SetupStage, message: string) => {
            mainWindow?.webContents.send(MainChannels.SETUP_PROJECT_CALLBACK, {
                stage,
                message,
            });
        };
        const path = args as string;
        return setupProject(path, progressCallback);
    });

    ipcMain.handle(
        MainChannels.CREATE_NEW_PROJECT_PROMPT,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { prompt, images } = args as { prompt: string; images: ImageMessageContext[] };
            return createProjectPrompt(prompt, images);
        },
    );
}

import { CreateStage, SetupStage, type CreateCallback, type SetupCallback } from '@onlook/models';
import type { ImageMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { mainWindow } from '..';
import { runBunCommand } from '../bun';
import projectCreator from '../create';
import { createProject } from '../create/install';

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
            return runBunCommand(installCommand, {
                cwd: folderPath,
                callbacks: {
                    onStdout: (data) => progressCallback(SetupStage.CONFIGURING, data),
                    onStderr: (data) => progressCallback(SetupStage.CONFIGURING, data),
                    onClose: (code, signal) => {
                        if (code !== 0) {
                            progressCallback(
                                SetupStage.ERROR,
                                `Failed to install dependencies. Code: ${code}, Signal: ${signal}`,
                            );
                        } else {
                            progressCallback(
                                SetupStage.COMPLETE,
                                'Project dependencies installed.',
                            );
                        }
                    },
                },
            });
        },
    );

    ipcMain.handle(
        MainChannels.CREATE_NEW_PROJECT_PROMPT,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const { prompt, images } = args as { prompt: string; images: ImageMessageContext[] };
            return projectCreator.createProject(prompt, images);
        },
    );

    ipcMain.handle(
        MainChannels.CANCEL_CREATE_NEW_PROJECT_PROMPT,
        (e: Electron.IpcMainInvokeEvent) => {
            return projectCreator.cancel();
        },
    );
}

import { MainChannels } from '@onlook/models/constants';
import { SupportedFrameworks, createPreviewEnvironment } from '@zonke-cloud/sdk';
import { ipcMain } from 'electron';

export interface CreateEnvOptions {
    userId: string;
    framework: 'nextjs' | 'remix' | 'react';
}

export function listenForHostingMessages() {
    ipcMain.handle(
        MainChannels.CREATE_PROJECT_HOSTING_ENV,
        (e: Electron.IpcMainInvokeEvent, args) => {
            const options = args as CreateEnvOptions;
            const framework = options.framework as SupportedFrameworks;
            const awsHostedZone = 'zonke.market';

            return createPreviewEnvironment({
                userId: options.userId,
                framework,
                awsHostedZone,
            });
        },
    );
}

import { MainChannels } from '@onlook/models/constants';
import type { PublishRequest, PublishResponse, UnpublishRequest } from '@onlook/models/hosting';
import { ipcMain } from 'electron';
import hostingManager from '../hosting';
import { createDomainVerification, getCustomDomains, verifyDomain } from '../hosting/domains';

export function listenForHostingMessages() {
    ipcMain.handle(
        MainChannels.PUBLISH_TO_DOMAIN,
        async (_e: Electron.IpcMainInvokeEvent, args: PublishRequest): Promise<PublishResponse> => {
            return await hostingManager.publish(args);
        },
    );

    ipcMain.handle(
        MainChannels.UNPUBLISH_DOMAIN,
        async (
            e: Electron.IpcMainInvokeEvent,
            args: UnpublishRequest,
        ): Promise<PublishResponse> => {
            const { urls } = args;
            return await hostingManager.unpublish(urls);
        },
    );

    ipcMain.handle(
        MainChannels.CREATE_DOMAIN_VERIFICATION,
        async (_e: Electron.IpcMainInvokeEvent, args) => {
            const { domain } = args;
            return await createDomainVerification(domain);
        },
    );

    ipcMain.handle(MainChannels.VERIFY_DOMAIN, async (_e: Electron.IpcMainInvokeEvent, args) => {
        const { domain } = args;
        return await verifyDomain(domain);
    });

    ipcMain.handle(MainChannels.GET_CUSTOM_DOMAINS, async (_e: Electron.IpcMainInvokeEvent) => {
        return await getCustomDomains();
    });
}

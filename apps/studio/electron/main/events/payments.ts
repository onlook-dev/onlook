import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { createCheckoutUrl } from '../payment';

export function listenForPaymentMessages() {
    ipcMain.handle(
        MainChannels.CREATE_CHECKOUT_URL,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            return await createCheckoutUrl();
        },
    );
}

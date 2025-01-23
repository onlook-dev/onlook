import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { checkoutWithStripe, checkSubscription, manageSubscription } from '../payment';

export function listenForPaymentMessages() {
    ipcMain.handle(
        MainChannels.CREATE_STRIPE_CHECKOUT,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            return await checkoutWithStripe();
        },
    );

    ipcMain.handle(
        MainChannels.MANAGE_SUBSCRIPTION,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            return await manageSubscription();
        },
    );

    ipcMain.handle(
        MainChannels.CHECK_SUBSCRIPTION,
        async (e: Electron.IpcMainInvokeEvent, args) => {
            return await checkSubscription();
        },
    );
}

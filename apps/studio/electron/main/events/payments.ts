import { MainChannels } from '@onlook/models/constants';
import { UsagePlanType } from '@onlook/models/usage';
import { ipcMain } from 'electron';
import { checkoutWithStripe, checkSubscription, manageSubscription } from '../payment';

export function listenForPaymentMessages() {
    ipcMain.handle(
        MainChannels.CREATE_STRIPE_CHECKOUT,
        async (e: Electron.IpcMainInvokeEvent, plan: UsagePlanType = UsagePlanType.PRO) => {
            return await checkoutWithStripe(plan);
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

import { ipcMain } from 'electron';
import Analytics from '../analytics';
import { MainChannels } from '/common/constants';

export function listenForAnalyticsMessages() {
    const analytics: Analytics = new Analytics();

    ipcMain.on(MainChannels.ANLYTICS_PREF_SET, (e: Electron.IpcMainInvokeEvent, args) => {
        const analyticsPref = args as boolean;
        analytics.toggleSetting(analyticsPref);
    });

    ipcMain.on(MainChannels.SEND_ANALYTICS, (e: Electron.IpcMainInvokeEvent, args) => {
        if (analytics) {
            const { event, data } = args as { event: string; data: object };
            analytics.track(event, data);
        }
    });
}

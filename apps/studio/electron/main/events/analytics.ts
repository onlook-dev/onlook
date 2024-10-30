import { ipcMain } from 'electron';
import analytics from '../analytics';
import { MainChannels } from '/common/constants';

export function listenForAnalyticsMessages() {
    ipcMain.on(MainChannels.UPDATE_ANALYTICS_PREFERENCE, (e: Electron.IpcMainInvokeEvent, args) => {
        // TODO: Handle this in update user settings. Check for enabledAnalytics.
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

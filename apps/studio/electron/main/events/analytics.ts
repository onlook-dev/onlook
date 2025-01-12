import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import analytics from '../analytics';
import Chat from '../chat';

export function listenForAnalyticsMessages() {
    ipcMain.on(MainChannels.UPDATE_ANALYTICS_PREFERENCE, (e: Electron.IpcMainInvokeEvent, args) => {
        const analyticsPref = args as boolean;
        analytics.toggleSetting(analyticsPref);
        // Analytics now handled through backend proxy
        analytics.track('analytics_preference_changed', { enabled: analyticsPref });
    });

    ipcMain.on(MainChannels.SEND_ANALYTICS, (e: Electron.IpcMainInvokeEvent, args) => {
        if (analytics) {
            const { event, data } = args as { event: string; data: object };
            analytics.track(event, data);
        }
    });

    ipcMain.on(MainChannels.SEND_ANALYTICS_ERROR, (e: Electron.IpcMainInvokeEvent, args) => {
        if (analytics) {
            const { event, data } = args as { event: string; data: object };
            analytics.trackError(event, data);
        }
    });
}

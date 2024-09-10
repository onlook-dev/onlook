import { ipcMain } from 'electron';
import * as Mixpanel from 'mixpanel';
import { nanoid } from 'nanoid';
import { PersistenStorage } from '../storage';
import { MainChannels } from '/common/constants';

export function sendAnalytics(event: string, data?: Record<string, any>) {
    ipcMain.emit(MainChannels.SEND_ANALYTICS, '', { event, data });
}

class Analytics {
    mixpanel: ReturnType<typeof Mixpanel.init> | undefined;
    id: string | undefined;

    constructor() {
        this.restoreSettings();
    }

    restoreSettings() {
        const settings = PersistenStorage.USER_SETTINGS.read();
        const enable = settings.enableAnalytics;
        this.id = settings.id;
        if (!this.id) {
            this.id = nanoid();
            PersistenStorage.USER_SETTINGS.write({ enableAnalytics: enable, id: this.id });
        }

        if (enable) {
            this.enable();
        } else {
            this.disable();
        }
    }

    toggleSetting(enable: boolean) {
        const settings = PersistenStorage.USER_SETTINGS.read();
        if (settings.enableAnalytics === enable) {
            return;
        }

        if (enable) {
            this.enable();
            this.track('enable analytics');
        } else {
            this.track('disable analytics');
            this.disable();
        }
        PersistenStorage.USER_SETTINGS.write({ enableAnalytics: enable, id: this.id });
    }

    enable() {
        try {
            this.mixpanel = Mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '');
        } catch (error) {
            console.warn('Error initializing Mixpanel:', error);
            console.warn('No Mixpanel client, analytics will not be collected');
        }
    }

    disable() {
        this.mixpanel = undefined;
    }

    track(event: string, data?: Record<string, any>, callback?: () => void) {
        if (this.mixpanel) {
            const eventData = {
                distinct_id: this.id,
                ...data,
            };
            this.mixpanel.track(event, eventData, callback);
        }
    }
}

export default Analytics;

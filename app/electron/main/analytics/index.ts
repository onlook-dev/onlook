import * as Mixpanel from 'mixpanel';
import { nanoid } from 'nanoid';
import { readUserSettings, writeUserSettings } from '../storage';

class Analytics {
    mixpanel: ReturnType<typeof Mixpanel.init> | undefined;
    id: string | undefined;

    constructor() {
        this.restoreSettings();
    }

    async restoreSettings() {
        const settings = await readUserSettings();
        const enable = settings.enableAnalytics;
        this.id = settings.id || nanoid();
        if (enable) {
            this.enable();
        } else {
            this.disable();
        }
        writeUserSettings({ ...settings, id: this.id });
    }

    toggleSetting(enable: boolean) {
        if (enable) {
            this.enable();
            this.track('analytics-enabled');
        } else {
            this.track('analytics-disabled');
            this.disable();
        }
        writeUserSettings({ enableAnalytics: enable, id: this.id });
    }

    enable() {
        try {
            this.mixpanel = Mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '');
        } catch (error) {
            console.error('Error initializing Mixpanel:', error);
            console.log('No Mixpanel client, analytics will not be collected');
        }
    }

    disable() {
        this.mixpanel = undefined;
        this.id = undefined;
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

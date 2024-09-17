import { ipcMain } from 'electron';
import * as Mixpanel from 'mixpanel';
import { nanoid } from 'nanoid';
import { PersistenStorage } from '../storage';
import { MainChannels } from '/common/constants';
import { UserMetadata } from '/common/models/settings';

export function sendAnalytics(event: string, data?: Record<string, any>) {
    ipcMain.emit(MainChannels.SEND_ANALYTICS, '', { event, data });
}

class Analytics {
    private static instance: Analytics;
    private mixpanel: ReturnType<typeof Mixpanel.init> | undefined;
    private id: string | undefined;

    private constructor() {
        this.restoreSettings();
    }

    public static getInstance(): Analytics {
        if (!Analytics.instance) {
            Analytics.instance = new Analytics();
        }
        return Analytics.instance;
    }

    private restoreSettings() {
        const settings = PersistenStorage.USER_SETTINGS.read() || {};
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

    public toggleSetting(enable: boolean) {
        const settings = PersistenStorage.USER_SETTINGS.read() || {};
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

    private enable() {
        try {
            this.mixpanel = Mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '');
        } catch (error) {
            console.warn('Error initializing Mixpanel:', error);
            console.warn('No Mixpanel client, analytics will not be collected');
        }
    }

    private disable() {
        this.mixpanel = undefined;
    }

    public track(event: string, data?: Record<string, any>, callback?: () => void) {
        if (this.mixpanel) {
            const eventData = {
                distinct_id: this.id,
                ...data,
            };
            this.mixpanel.track(event, eventData, callback);
        }
    }

    public identify(user: UserMetadata) {
        if (this.mixpanel && this.id) {
            if (user.id !== this.id) {
                this.mixpanel.alias(user.id, this.id);
                PersistenStorage.USER_SETTINGS.update({ id: user.id });
            }

            this.mixpanel.people.set(this.id, {
                $name: user.name,
                $email: user.email,
                $avatar: user.avatarUrl,
            });
        }
    }

    public signOut() {
        PersistenStorage.USER_SETTINGS.write({ id: undefined });
    }
}

export default Analytics.getInstance();

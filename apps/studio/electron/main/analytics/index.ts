import { MainChannels } from '@onlook/models/constants';
import type { UserMetadata } from '@onlook/models/settings';
import { app, ipcMain } from 'electron';
import * as Mixpanel from 'mixpanel';
import { nanoid } from 'nanoid/non-secure';
import { PersistentStorage } from '../storage';

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
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        const enable = settings.enableAnalytics !== undefined ? settings.enableAnalytics : true;
        this.id = settings.id;
        if (!this.id) {
            this.id = nanoid();
            PersistentStorage.USER_SETTINGS.update({ enableAnalytics: enable, id: this.id });
        }

        if (enable) {
            this.enable();
        } else {
            this.disable();
        }
    }

    public toggleSetting(enable: boolean) {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
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
        PersistentStorage.USER_SETTINGS.update({ enableAnalytics: enable, id: this.id });
    }

    private enable() {
        try {
            this.mixpanel = Mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN || '');
            const settings = PersistentStorage.USER_METADATA.read();
            if (settings) {
                this.identify(settings);
            }
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
                PersistentStorage.USER_SETTINGS.update({ id: user.id });
            }

            this.mixpanel.people.set(this.id, {
                $name: user.name,
                $email: user.email,
                $avatar: user.avatarUrl,
                platform: process.platform,
                version: app.getVersion(),
            });
        }
    }

    public signOut() {
        PersistentStorage.USER_SETTINGS.update({ id: undefined });
    }
}

export default Analytics.getInstance();

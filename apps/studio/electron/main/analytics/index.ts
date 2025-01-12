import { MainChannels } from '@onlook/models/constants';
import type { UserMetadata } from '@onlook/models/settings';
import { app, ipcMain } from 'electron';
import { nanoid } from 'nanoid/non-secure';
import { PersistentStorage } from '../storage';
import { API_ROUTES } from '../config';

export function sendAnalytics(event: string, data?: Record<string, any>) {
    ipcMain.emit(MainChannels.SEND_ANALYTICS, '', { event, data });
}

class Analytics {
    private static instance: Analytics;
    private id: string | undefined;
    private enabled: boolean = false;

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
        this.enabled = true;
        const settings = PersistentStorage.USER_METADATA.read();
        if (settings) {
            this.identify(settings);
        }
    }

    private disable() {
        this.enabled = false;
    }

    private getAuthToken(): string | null {
        const tokens = PersistentStorage.AUTH_TOKENS.read();
        return tokens?.accessToken || null;
    }

    public async track(event: string, data?: Record<string, any>) {
        if (!this.enabled) {
            return;
        }

        const token = this.getAuthToken();
        if (!token) {
            console.warn('No auth token available for analytics');
            return;
        }

        try {
            const response = await fetch(API_ROUTES.MIXPANEL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    event,
                    data: {
                        distinct_id: this.id,
                        ...data,
                    },
                }),
            });

            if (!response.ok) {
                console.error('Failed to send analytics:', await response.text());
            }
        } catch (error) {
            console.error('Analytics error:', error);
        }
    }

    public trackError(message: string, data?: Record<string, any>) {
        this.track('error', {
            message,
            ...data,
        });
    }

    public async identify(user: UserMetadata) {
        if (user.id !== this.id) {
            PersistentStorage.USER_SETTINGS.update({ id: user.id });
            this.id = user.id;
        }

        await this.track('$identify', {
            $name: user.name,
            $email: user.email,
            $avatar: user.avatarUrl,
            platform: process.platform,
            version: app.getVersion(),
        });
    }

    public signOut() {
        PersistentStorage.USER_SETTINGS.update({ id: undefined });
    }
}

export default Analytics.getInstance();

import { api } from '@/trpc/client';
import { DefaultSettings } from '@onlook/constants';
import { getDefaultUserSettings } from '@onlook/db';
import type { ChatSettings, UserMetadata, UserSettings } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

export class UserSettingsManager {
    settings: UserSettings = getDefaultUserSettings();
    private _user: UserMetadata | null = null;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);

        reaction
            (() => this.userManager.user,
                (user) => {
                    this._user = user;
                    this.restoreSettings();
                },
            );
    }

    async restoreSettings() {
        if (!this.userManager.user) {
            console.error('No user found');
            return;
        }
        const settings = await api.user.getSettings.query(this.userManager.user.id);
        this.settings = settings;
    }

    async update(newSettings: Partial<UserSettings>) {
        if (!this.settings) {
            console.error('No settings found');
            return;
        }

        if (!this._user) {
            console.error('No user found');
            return;
        }

        await api.user.updateSettings.mutate({
            id: this.settings.id,
            userId: this._user.id,
            ...newSettings,
        });
        this.settings = { ...this.settings, ...newSettings };
    }

    async updateChat(newSettings: Partial<ChatSettings>) {
        const newChatSettings = {
            ...DefaultSettings.CHAT_SETTINGS,
            ...this.settings?.chat,
            ...newSettings,
        };

        this.settings = {
            ...this.settings,
            chat: newChatSettings,
        };

        await this.update({ chat: newChatSettings });
    }
}

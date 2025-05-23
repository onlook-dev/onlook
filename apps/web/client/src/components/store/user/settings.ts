import { api } from '@/trpc/client';
import { DefaultSettings } from '@onlook/constants';
import { getDefaultUserSettings } from '@onlook/db';
import type { ChatSettings, UserSettings } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

export class UserSettingsManager {
    settings: UserSettings = getDefaultUserSettings();

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);

        this.restoreSettings();
        reaction(
            () => this.userManager.user,
            (user) => {
                if (user) {
                    this.restoreSettings();
                }
            }
        );
    }

    async restoreSettings() {
        const user = this.userManager.user;
        if (!user) {
            console.error('No user found');
            return;
        }
        const settings = await api.user.getSettings.query(user.id);
        this.settings = settings;
    }

    async update(newSettings: Partial<UserSettings>) {
        const user = this.userManager.user;
        if (!user) {
            console.error('No user found');
            return;
        }

        await api.user.updateSettings.mutate({
            id: this.settings.id,
            userId: user.id,
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

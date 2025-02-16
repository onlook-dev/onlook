import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import type { ChatSettings, UserSettings } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class UserManager {
    settings: UserSettings | null = null;

    constructor() {
        makeAutoObservable(this);
        this.restoreSettings();
    }

    async restoreSettings() {
        this.settings = await invokeMainChannel(MainChannels.GET_USER_SETTINGS);
    }

    async updateSettings(settings: Partial<UserSettings>) {
        this.settings = { ...this.settings, ...settings };
        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, settings);
    }

    async updateChatSettings(newSettings: Partial<ChatSettings>) {
        const newChatSettings = {
            ...DefaultSettings.CHAT_SETTINGS,
            ...this.settings?.chatSettings,
            ...newSettings,
        };

        this.settings = {
            ...this.settings,
            chatSettings: newChatSettings,
        };

        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, {
            chatSettings: newChatSettings,
        });
    }
}

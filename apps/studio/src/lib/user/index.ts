import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import type { ChatSettings, UserSettings } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class UserManager {
    settings: UserSettings | null = null;

    constructor() {
        makeAutoObservable(this);
        this.fetchSettings();
    }

    async fetchSettings() {
        this.settings = await invokeMainChannel(MainChannels.GET_USER_SETTINGS);
    }

    async updateSettings(settings: Partial<UserSettings>) {
        this.settings = { ...this.settings, ...settings };
        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, settings);
    }

    async updateChatSettings(settings: Partial<ChatSettings>) {
        this.settings = {
            ...this.settings,
            chatSettings: {
                ...DefaultSettings.CHAT_SETTINGS,
                ...this.settings?.chatSettings,
                ...settings,
            },
        };

        console.log('this.settings', JSON.stringify(this.settings, null, 2));

        await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, {
            chatSettings: settings,
        });
    }
}

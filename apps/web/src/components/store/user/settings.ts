import { DefaultSettings } from '@onlook/models/constants';
import type { ChatSettings, EditorSettings, UserSettings } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';

export class UserSettingsManager {
    settings: UserSettings | null = null;
    defaultProjectPath: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.restoreSettings();
    }

    async restoreSettings() {
        // this.settings = await invokeMainChannel(MainChannels.GET_USER_SETTINGS);
        // this.defaultProjectPath = await invokeMainChannel(MainChannels.GET_CREATE_PROJECT_PATH);
    }

    async update(settings: Partial<UserSettings>) {
        this.settings = { ...this.settings, ...settings };
        // await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, settings);
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

        // await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, {
        //     chat: newChatSettings,
        // });
    }

    async updateEditor(newSettings: Partial<EditorSettings>) {
        const newEditorSettings = {
            ...DefaultSettings.EDITOR_SETTINGS,
            ...this.settings?.editor,
            ...newSettings,
        };

        this.settings = {
            ...this.settings,
            editor: newEditorSettings,
        };

        // await invokeMainChannel(MainChannels.UPDATE_USER_SETTINGS, {
        //     editor: newEditorSettings,
        // });
    }
}

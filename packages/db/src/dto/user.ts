import { DefaultSettings } from "@onlook/constants";
import type { UserSettings } from "@onlook/models";
import { v4 as uuid } from 'uuid';
import { type UserSettings as DbUserSettings } from "../schema/user";

export const toUserSettings = (settings: DbUserSettings): UserSettings => {
    return {
        id: settings.id,
        chat: {
            autoApplyCode: settings.autoApplyCode ?? DefaultSettings.CHAT_SETTINGS.autoApplyCode,
            expandCodeBlocks: settings.expandCodeBlocks ?? DefaultSettings.CHAT_SETTINGS.expandCodeBlocks,
            showSuggestions: settings.showSuggestions ?? DefaultSettings.CHAT_SETTINGS.showSuggestions,
            showMiniChat: settings.showMiniChat ?? DefaultSettings.CHAT_SETTINGS.showMiniChat,
        },
    };
};

export const fromUserSettings = (userId: string, settings: UserSettings): DbUserSettings => {
    return {
        id: settings.id,
        userId,
        autoApplyCode: settings.chat.autoApplyCode,
        expandCodeBlocks: settings.chat.expandCodeBlocks,
        showSuggestions: settings.chat.showSuggestions,
        showMiniChat: settings.chat.showMiniChat,
    };
};

export const getDefaultUserSettings = (): UserSettings => {
    return {
        id: uuid(),
        chat: DefaultSettings.CHAT_SETTINGS,
    };
};
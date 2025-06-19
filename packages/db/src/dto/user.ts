import { DefaultSettings } from '@onlook/constants';
import type { UserMetadata, UserSettings } from '@onlook/models';
import { get } from 'lodash';
import type { AuthUser, UserSettings as DbUserSettings } from '../schema';

export const toUserSettings = (settings: DbUserSettings): UserSettings => {
    return {
        id: settings.id,
        chat: {
            autoApplyCode: settings.autoApplyCode ?? DefaultSettings.CHAT_SETTINGS.autoApplyCode,
            expandCodeBlocks:
                settings.expandCodeBlocks ?? DefaultSettings.CHAT_SETTINGS.expandCodeBlocks,
            showSuggestions:
                settings.showSuggestions ?? DefaultSettings.CHAT_SETTINGS.showSuggestions,
            showMiniChat: settings.showMiniChat ?? DefaultSettings.CHAT_SETTINGS.showMiniChat,
        },
        editor: {
            shouldWarnDelete: settings.shouldWarnDelete ?? DefaultSettings.EDITOR_SETTINGS.shouldWarnDelete,
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
        shouldWarnDelete: settings.editor.shouldWarnDelete,
    };
};

export const fromAuthUser = (authUser: AuthUser): UserMetadata => {
    return {
        id: authUser.id,
        name: get(authUser.rawUserMetaData, 'full_name'),
        email: authUser.email,
        avatarUrl: get(authUser.rawUserMetaData, 'avatar_url'),
    };
};

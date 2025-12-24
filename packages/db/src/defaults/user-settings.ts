import { DefaultSettings } from '@onlook/constants';
import type { UserSettings as DbUserSettings } from '@onlook/db';
import { v4 as uuid } from 'uuid';

export const createDefaultUserSettings = (userId: string): DbUserSettings => {
    return {
        id: uuid(),
        userId,
        autoApplyCode: DefaultSettings.CHAT_SETTINGS.autoApplyCode,
        expandCodeBlocks: DefaultSettings.CHAT_SETTINGS.expandCodeBlocks,
        showSuggestions: DefaultSettings.CHAT_SETTINGS.showSuggestions,
        showMiniChat: DefaultSettings.CHAT_SETTINGS.showMiniChat,
        shouldWarnDelete: DefaultSettings.EDITOR_SETTINGS.shouldWarnDelete,
    };
};

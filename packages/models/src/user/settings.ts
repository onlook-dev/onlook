export interface UserSettings {
    id: string;
    chat: ChatSettings;
}

export interface ChatSettings {
    showSuggestions: boolean;
    autoApplyCode: boolean;
    expandCodeBlocks: boolean;
    showMiniChat: boolean;
}

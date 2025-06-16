export interface UserSettings {
    id: string;
    chat: ChatSettings;
    editor: EditorSettings;
}

export interface ChatSettings {
    showSuggestions: boolean;
    autoApplyCode: boolean;
    expandCodeBlocks: boolean;
    showMiniChat: boolean;
}

export interface EditorSettings {
    shouldWarnDelete: boolean;
    enableBunReplace: boolean;
    buildFlags: string;
}

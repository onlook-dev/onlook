import { IdeType } from '../ide';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    signInMethod?: string;
    editor?: EditorSettings;
    chat?: ChatSettings;
}

export interface EditorSettings {
    shouldWarnDelete?: boolean;
    ideType?: IdeType;
    enableBunReplace?: boolean;
    buildFlags?: string;
    newProjectPath?: string;
}

export interface ChatSettings {
    showSuggestions: boolean;
    autoApplyCode: boolean;
    expandCodeBlocks: boolean;
    showMiniChat: boolean;
}

export interface UserMetadata {
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    plan?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    expiresIn: string;
    providerToken: string;
    tokenType: string;
}

export interface AppState {
    activeProjectId: string | null;
}

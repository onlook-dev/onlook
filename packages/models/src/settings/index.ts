import { IdeType } from '../ide';
import { type Project } from '../projects';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
    signInMethod?: string;
    shouldWarnDelete?: boolean;
    chatSettings?: {
        showSuggestions: boolean;
        autoApplyCode: boolean;
        expandCodeBlocks: boolean;
    };
}

export interface ProjectsCache {
    projects: Project[];
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

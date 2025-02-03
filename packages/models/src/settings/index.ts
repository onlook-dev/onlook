import { IdeType } from '../ide';
import { type Project } from '../projects';
import { UsagePlanType } from '../usage';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
    signInMethod?: string;
    shouldWarnDelete?: boolean;
}

export interface ProjectsCache {
    projects: Project[];
}

export interface UserMetadata {
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    planType?: UsagePlanType;
    planDailyLimit?: number;
    planMonthlyLimit?: number;
    planIsActive?: boolean;
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

import { IdeType } from '../ide';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
}

export interface RectPosition {
    x: number;
    y: number;
}

export interface RectDimension {
    width: number;
    height: number;
}

export interface FrameSettings {
    id: string;
    url: string;
    position: RectPosition;
    dimension: RectDimension;
}

export interface ProjectSettings {
    scale?: number;
    frames?: FrameSettings[];
    position?: RectPosition;
}

export interface UserMetadata {
    id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    expiresIn: string;
    providerToken: string;
    tokenType: string;
}

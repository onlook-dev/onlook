import { IdeType } from '../ide';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
}

export interface ProjectSettings {
    url?: string;
    scale?: number;
    position?: {
        x: number;
        y: number;
    };
    size?: {
        width: number;
        height: number;
    };
}

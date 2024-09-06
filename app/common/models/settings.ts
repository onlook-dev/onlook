import { IdeType } from '../ide';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
}

export interface FrameSettings {
    url?: string;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
}

export interface ProjectSettings {
    scale?: number;
    frames?: FrameSettings[];
}

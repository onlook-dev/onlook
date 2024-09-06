import { IdeType } from '../ide';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
}

export interface FrameSettings {
    id: string;
    url: string;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ProjectPosition {
    x: number;
    y: number;
}

export interface ProjectSettings {
    scale?: number;
    frames?: FrameSettings[];
    position?: ProjectPosition;
}

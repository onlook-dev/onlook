import { Orientation, Theme } from '../constants';

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
    orientation: Orientation | null;
    aspectRatioLocked: boolean | null;
    device: string | null;
    theme: Theme | null;
}

export interface ProjectSettings {
    scale: number | null;
    frames: FrameSettings[] | null;
    position: RectPosition | null;
}

export interface HostingSettings {
    url: string | null;
}

export enum DomainType {
    BASE = 'base',
    CUSTOM = 'custom',
}

export interface DomainSettings {
    url: string;
    type: DomainType;
    publishedAt: string;
}

export interface Project {
    id: string;
    name: string;
    folderPath: string;
    url: string;
    previewImg: string | null;
    createdAt: string;
    updatedAt: string;
    settings: ProjectSettings | null;
    commands: ProjectCommands | null;
    domains: {
        base: DomainSettings | null;
        custom: DomainSettings | null;
    } | null;

    // deprecated
    // hosting?: HostingSettings | null;
}

export enum WindowCommand {
    MINIMIZE = 'minimize',
    MAXIMIZE = 'maximize',
    UNMAXIMIZE = 'unmaximize',
    CLOSE = 'close',
}

export interface ProjectCommands {
    build?: string;
    run?: string;
    install?: string;
}

import type { Frame, RectPosition } from './frame';

export interface Project {
    id: string;
    name: string;
    previewImg: string | null;
    createdAt: string;
    updatedAt: string;
    canvas: CanvasSettings | null;
    commands: Commands | null;
    domains: {
        base: DomainSettings | null;
        custom: DomainSettings | null;
    } | null;
}

export interface CanvasSettings {
    scale: number | null;
    frames: Frame[] | null;
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
    publishedAt?: string;
}

export interface Commands {
    build?: string;
    run?: string;
    install?: string;
}

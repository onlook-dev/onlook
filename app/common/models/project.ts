export interface Project {
    id: string;
    name: string;
    folderPath: string;
    url: string;
    previewImg?: string;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
    settings?: ProjectSettings;
}

export interface ProjectSettings {
    scale?: number;
    frames?: FrameSettings[];
    position?: RectPosition;
}

export interface FrameSettings {
    id: string;
    url: string;
    position: RectPosition;
    dimension: RectDimension;
}

export interface RectPosition {
    x: number;
    y: number;
}

export interface RectDimension {
    width: number;
    height: number;
}

export interface ImageData {
    name: string;
    path: string;
    mimeType?: string;
}

export interface FolderData {
    name: string;
    path: string;
}

export interface BreadcrumbSegment {
    name: string;
    path: string;
}
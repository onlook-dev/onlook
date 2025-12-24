export interface AssetUploadResult {
    id: string;
    url: string;
    path: string;
    optimizedPath?: string;
    thumbnailPath?: string;
}

export interface AssetOptimization {
    format: string;
    quality?: number;
    width?: number;
    height?: number;
}

export interface AssetMetadata {
    dimensions?: { width: number; height: number };
    colorProfile?: string;
    compression?: string;
    source?: string;
}

export interface AssetReference {
    filePath: string;
    lineNumber?: string;
    importStatement?: string;
    referenceType: 'import' | 'url' | 'inline';
}
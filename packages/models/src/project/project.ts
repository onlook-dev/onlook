export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: Date;
        updatedAt: Date;
        previewImg: PreviewImg | null;
        description: string | null;
        tags: string[];
    };
}

export interface PreviewImg {
    type: 'storage' | 'url';
    storagePath?: {
        bucket: string;
        path: string;
    };
    url?: string;
    updatedAt: Date | null;
}

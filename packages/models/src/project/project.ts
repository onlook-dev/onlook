export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: PreviewImg | null;
        description: string | null;
    };
    sandbox: {
        id: string;
        url: string;
    };
}

export interface PreviewImg {
    type: 'storage' | 'url';
    storagePath?: {
        bucket: string;
        path: string;
    };
    url?: string;
}

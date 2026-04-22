import type { ProjectEnvironment } from './environment';

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
    /** 默认分支的运行环境 */
    environment?: ProjectEnvironment;
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

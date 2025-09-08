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
    githubRepoName?: string | null;
    githubRepoOwner?: string | null;
    githubRepoUrl?: string | null;
    githubDefaultBranch?: string | null;
    githubConnectedAt?: Date | null;
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

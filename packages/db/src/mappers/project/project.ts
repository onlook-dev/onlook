import type { PreviewImg, Project } from '@onlook/models';
import type { Project as DbProject } from '../../schema';

export const fromDbProject = (dbProject: DbProject): Project => ({
    id: dbProject.id,
    name: dbProject.name,
    metadata: {
        createdAt: dbProject.createdAt,
        updatedAt: dbProject.updatedAt,
        previewImg: fromDbPreviewImg(dbProject),
        description: dbProject.description,
        tags: dbProject.tags ?? [],
    },
    githubRepoName: dbProject.githubRepoName ?? null,
    githubRepoOwner: dbProject.githubRepoOwner ?? null,
    githubRepoUrl: dbProject.githubRepoUrl ?? null,
    githubDefaultBranch: dbProject.githubDefaultBranch ?? null,
    githubConnectedAt: dbProject.githubConnectedAt ?? null,
});

export const toDbProject = (project: Project): DbProject => {
    const { previewImgUrl, previewImgPath, previewImgBucket, updatedPreviewImgAt } = toDbPreviewImg(project.metadata.previewImg);
    
    return {
        id: project.id,
        name: project.name,
        tags: project.metadata.tags ?? [],
        createdAt: project.metadata.createdAt,
        updatedAt: project.metadata.updatedAt,
        description: project.metadata.description,
        previewImgUrl,
        previewImgPath,
        previewImgBucket,
        updatedPreviewImgAt,
        githubRepoName: project.githubRepoName ?? null,
        githubRepoOwner: project.githubRepoOwner ?? null,
        githubRepoUrl: project.githubRepoUrl ?? null,
        githubDefaultBranch: project.githubDefaultBranch ?? null,
        githubConnectedAt: project.githubConnectedAt ?? null,
        sandboxId: null,
        sandboxUrl: null,
    };
};

export const fromDbPreviewImg = (dbProject: DbProject): PreviewImg | null => {
    if (dbProject.previewImgUrl) {
        return {
            type: 'url',
            url: dbProject.previewImgUrl,
            updatedAt: dbProject.updatedPreviewImgAt,
        };
    }
    
    if (dbProject.previewImgPath && dbProject.previewImgBucket) {
        return {
            type: 'storage',
            storagePath: {
                bucket: dbProject.previewImgBucket,
                path: dbProject.previewImgPath,
            },
            updatedAt: dbProject.updatedPreviewImgAt,
        };
    }
    
    return null;
};

export const toDbPreviewImg = (previewImg: PreviewImg | null): {
    previewImgUrl: string | null;
    previewImgPath: string | null;
    previewImgBucket: string | null;
    updatedPreviewImgAt: Date | null;
} => {
    const defaultResult = {
        previewImgUrl: null,
        previewImgPath: null,
        previewImgBucket: null,
        updatedPreviewImgAt: null,
    };

    if (!previewImg) return defaultResult;

    const result = { ...defaultResult };

    if (previewImg.type === 'url' && previewImg.url) {
        result.previewImgUrl = previewImg.url;
    } else if (previewImg.type === 'storage' && previewImg.storagePath?.path && previewImg.storagePath?.bucket) {
        result.previewImgPath = previewImg.storagePath.path;
        result.previewImgBucket = previewImg.storagePath.bucket;
    }

    result.updatedPreviewImgAt = previewImg.updatedAt ?? new Date();
    return result;
};
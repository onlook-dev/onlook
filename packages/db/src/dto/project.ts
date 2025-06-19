import type { PreviewImg, Project } from '@onlook/models';
import type { Project as DbProject } from '../schema';

export const toProject = (
    dbProject: DbProject,
): Project => {
    return {
        id: dbProject.id,
        name: dbProject.name,
        sandbox: {
            id: dbProject.sandboxId,
            url: dbProject.sandboxUrl,
        },
        metadata: {
            createdAt: dbProject.createdAt.toISOString(),
            updatedAt: dbProject.updatedAt.toISOString(),
            previewImg: getPreviewImgFromDb(dbProject),
            description: dbProject.description,
        },
    };
};

export const fromProject = (project: Project): DbProject => {
    const { previewImgUrl, previewImgPath, previewImgBucket } = getPreviewImgFromModel(project.metadata.previewImg);
    return {
        id: project.id,
        name: project.name,
        sandboxId: project.sandbox.id,
        sandboxUrl: project.sandbox.url,
        createdAt: new Date(project.metadata.createdAt),
        updatedAt: new Date(project.metadata.updatedAt),
        description: project.metadata.description,
        previewImgUrl,
        previewImgPath,
        previewImgBucket,
    };
};

function getPreviewImgFromDb(dbProject: DbProject): PreviewImg | null {
    let previewImg: PreviewImg | null = null;
    if (dbProject.previewImgUrl) {
        previewImg = {
            type: 'url',
            url: dbProject.previewImgUrl,
        };
    } else if (dbProject.previewImgPath && dbProject.previewImgBucket) {
        previewImg = {
            type: 'storage',
            storagePath: {
                bucket: dbProject.previewImgBucket,
                path: dbProject.previewImgPath,
            },
        };
    }
    return previewImg;
}

function getPreviewImgFromModel(previewImg: PreviewImg | null): { previewImgUrl: string | null, previewImgPath: string | null, previewImgBucket: string | null } {
    let res: {
        previewImgUrl: string | null,
        previewImgPath: string | null,
        previewImgBucket: string | null,
    } = {
        previewImgUrl: null,
        previewImgPath: null,
        previewImgBucket: null,
    };

    if (!previewImg) {
        return res;
    }

    if (previewImg.type === 'url' && previewImg.url) {
        res.previewImgUrl = previewImg.url;
    } else if (previewImg.type === 'storage' && previewImg.storagePath && previewImg.storagePath.path && previewImg.storagePath.bucket) {
        res.previewImgPath = previewImg.storagePath.path;
        res.previewImgBucket = previewImg.storagePath.bucket;
    }
    return res;
}
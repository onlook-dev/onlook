import type { Project } from '@onlook/models';
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
            previewImg: dbProject.previewImg,
        },
    };
};

export const fromProject = (project: Project): DbProject => {
    return {
        id: project.id,
        name: project.name,
        sandboxId: project.sandbox.id,
        sandboxUrl: project.sandbox.url,
        createdAt: new Date(project.metadata.createdAt),
        updatedAt: new Date(project.metadata.updatedAt),
        previewImg: project.metadata.previewImg,
    };
};

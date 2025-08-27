import type { Project as DbProject } from '@onlook/db';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultProject = (
    {
        overrides,
    }: {
        overrides?: Partial<DbProject>
    },
): DbProject => {
    return {
        id: uuidv4(),
        name: 'New Project',
        description: 'New Project Description',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        previewImgUrl: null,
        previewImgPath: null,
        previewImgBucket: null,
        updatedPreviewImgAt: null,
        ...overrides,
    } satisfies DbProject;
};
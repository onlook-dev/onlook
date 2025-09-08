import type { Project as DbProject } from '@onlook/db';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultProject = ({
    overrides = {},
}: {
    overrides?: Partial<DbProject>;
}): DbProject => ({
    id: uuidv4(),
    name: 'New Project',
    description: 'Your new project',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    previewImgUrl: null,
    previewImgPath: null,
    previewImgBucket: null,
    updatedPreviewImgAt: null,
    githubRepoName: null,
    githubRepoOwner: null,
    githubRepoUrl: null,
    githubDefaultBranch: null,
    githubConnectedAt: null,
    sandboxId: null,
    sandboxUrl: null,
    ...overrides,
});
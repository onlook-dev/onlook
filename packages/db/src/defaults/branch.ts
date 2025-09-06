import { v4 as uuidv4 } from 'uuid';
import type { Branch as DbBranch } from '../schema';

export const createDefaultBranch = (
    {
        projectId,
        sandboxId,
        overrides = {},
    }: {
        projectId: string; sandboxId: string; overrides?: Partial<DbBranch>
    },
): DbBranch => {
    return {
        id: uuidv4(),
        projectId,
        name: 'main',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Main branch',
        gitBranch: null,
        gitCommitSha: null,
        gitRepoUrl: null,
        sandboxId,
        ...overrides,
    };
};  
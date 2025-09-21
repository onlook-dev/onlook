import type { Branch } from '@onlook/models';
import type { Branch as DbBranch } from '../../schema';

export const fromDbBranch = (dbBranch: DbBranch): Branch => {
    return {
        id: dbBranch.id,
        projectId: dbBranch.projectId,
        name: dbBranch.name,
        description: dbBranch.description,
        createdAt: dbBranch.createdAt,
        updatedAt: dbBranch.updatedAt,
        isDefault: dbBranch.isDefault,
        git:
            dbBranch.gitBranch ||
                dbBranch.gitCommitSha ||
                dbBranch.gitRepoUrl
                ? {
                    branch: dbBranch.gitBranch,
                    commitSha: dbBranch.gitCommitSha,
                    repoUrl: dbBranch.gitRepoUrl,
                }
                : null,
        sandbox: {
            id: dbBranch.sandboxId,
        },
    };
};

export const toDbBranch = (branch: Branch): DbBranch => {
    return {
        id: branch.id,
        name: branch.name,
        projectId: branch.projectId,
        description: branch.description,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
        isDefault: branch.isDefault,
        gitBranch: branch.git?.branch ?? null,
        gitCommitSha: branch.git?.commitSha ?? null,
        gitRepoUrl: branch.git?.repoUrl ?? null,
        sandboxId: branch.sandbox.id,
    };
};

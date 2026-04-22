import { ProjectEnvironment, type Branch } from '@onlook/models';
import type { Branch as DbBranch } from '../../schema';

/**
 * 将数据库 Branch 记录转换为前端模型
 * sandbox 字段：仅当 environment 为 SANDBOX 且 sandboxId 存在时有值
 */
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
        /** 沙箱信息：仅 SANDBOX 环境且有 sandboxId 时有值 */
        sandbox: dbBranch.sandboxId
            ? { id: dbBranch.sandboxId }
            : null,
        /** 运行环境：从数据库读取，默认 SANDBOX */
        environment: (dbBranch.environment as ProjectEnvironment) ?? ProjectEnvironment.SANDBOX,
        /** 本地路径 */
        localPath: dbBranch.localPath ?? null,
        /** 本地项目运行配置 */
        localConfig: dbBranch.localConfig ?? null,
    };
};

/**
 * 将前端 Branch 模型转换为数据库记录
 */
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
        sandboxId: branch.sandbox?.id ?? null,
        environment: branch.environment,
        localPath: branch.localPath ?? null,
        localConfig: branch.localConfig ?? null,
    };
};

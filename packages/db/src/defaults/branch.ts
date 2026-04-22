import { ProjectEnvironment } from '@onlook/models';
import { v4 as uuidv4 } from 'uuid';
import type { Branch as DbBranch } from '../schema';

/**
 * 创建默认分支
 * @param projectId - 项目 ID
 * @param sandboxId - 沙箱 ID（本地环境可为空）
 * @param overrides - 覆盖字段
 */
export const createDefaultBranch = (
    {
        projectId,
        sandboxId,
        overrides = {},
    }: {
        projectId: string; sandboxId?: string | null; overrides?: Partial<DbBranch>
    },
): DbBranch => {
    // 根据是否提供 sandboxId 判断环境类型
    const environment = overrides.environment ?? (sandboxId ? ProjectEnvironment.SANDBOX : ProjectEnvironment.LOCAL_VSCODE);

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
        sandboxId: sandboxId ?? null,
        environment,
        localPath: null,
        localConfig: null,
        ...overrides,
    };
};

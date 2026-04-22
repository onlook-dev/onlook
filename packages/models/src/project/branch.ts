import type { ProjectEnvironment } from './environment';

/** 本地项目运行配置 */
export interface LocalConfig {
    /** 开发命令，如 "npm run dev"、"npx next dev" */
    devCommand: string;
    /** 构建命令，如 "npm run build" */
    buildCommand: string;
    /** 开发服务器端口 */
    port: number;
}

/** 本地项目默认配置 */
export const DEFAULT_LOCAL_CONFIG: LocalConfig = {
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
    port: 3001,
};

export interface Branch {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    isDefault: boolean;
    git: {
        branch: string | null;
        commitSha: string | null;
        repoUrl: string | null;
    } | null;
    /** 沙箱信息，仅 SANDBOX 环境有值 */
    sandbox: {
        id: string;
    } | null;
    /** 项目运行环境 */
    environment: ProjectEnvironment;
    /** 项目本地路径，仅 LOCAL_VSCODE 环境有值 */
    localPath: string | null;
    /** 本地项目运行配置，仅 LOCAL_VSCODE 环境有值 */
    localConfig: LocalConfig | null;
}

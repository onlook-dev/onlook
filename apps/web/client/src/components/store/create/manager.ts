import { api } from '@/trpc/client';
import { SandboxTemplates, Templates } from '@onlook/constants';
import { createDefaultProject } from '@onlook/db';
import { CreateRequestContextType, ProjectEnvironment, DEFAULT_LOCAL_CONFIG } from '@onlook/models';
import { type ImageMessageContext } from '@onlook/models/chat';
import { makeAutoObservable } from "mobx";
import { parseRepoUrl } from '../editor/pages/helper';

export class CreateManager {
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    async generateProjectName(prompt: string): Promise<string> {
        try {
            const generatedName = await api.project.generateName.mutate({
                prompt: prompt,
            });
            return generatedName;
        } catch (error) {
            console.error('Error generating project name:', error);
            return 'New Project';
        }
    }

    /** 通过提示词创建项目（沙箱环境） */
    async startCreate(userId: string, prompt: string, images: ImageMessageContext[]) {
        this.error = null;
        try {
            if (!userId) {
                console.error('No user ID found');
                return;
            }
            const config = {
                title: `Prompted project - ${userId}`,
                tags: ['prompt', userId],
            };

            const [{ sandboxId, previewUrl }, projectName] = await Promise.all([
                api.sandbox.fork.mutate({
                    sandbox: SandboxTemplates[Templates.EMPTY_NEXTJS],
                    config,
                }),
                this.generateProjectName(prompt)
            ]);
            const project = createDefaultProject({
                overrides: {
                    name: projectName,
                },
            });
            const newProject = await api.project.create.mutate({
                project,
                userId,
                sandboxId,
                sandboxUrl: previewUrl,
                environment: ProjectEnvironment.SANDBOX,
                creationData: {
                    context: [
                        {
                            type: CreateRequestContextType.PROMPT,
                            content: prompt,
                        },
                        ...images.map((image) => ({
                            type: CreateRequestContextType.IMAGE,
                            content: image.content,
                            mimeType: image.mimeType,
                        })),
                    ],
                },
            });

            return newProject;
        }
        catch (error) {
            console.error(error);
            this.error = error instanceof Error ? error.message : 'An unknown error occurred';
        }
    }

    /** 通过 GitHub 模板创建项目（沙箱环境） */
    async startGitHubTemplate(userId: string, repoUrl: string) {
        this.error = null;
        try {
            if (!userId) {
                console.error('No user ID found');
                return;
            }
            const { owner, repo } = parseRepoUrl(repoUrl);
            const { branch, isPrivateRepo } = await api.github.validate.mutate({
                owner: owner,
                repo: repo
            });

            if (isPrivateRepo) {
                this.error = "The repository you've provided is private. Only public repositories are supported";
                return;
            }

            const [{ sandboxId, previewUrl }, projectName] = await Promise.all([
                this.createSandboxFromGithub(repoUrl, branch),
                this.generateProjectName(`Import from GitHub repository: ${repo}`)
            ]);
            const project = createDefaultProject({
                overrides: {
                    name: projectName,
                },
            });
            const newProject = await api.project.create.mutate({
                project,
                userId,
                sandboxId,
                sandboxUrl: previewUrl,
                environment: ProjectEnvironment.SANDBOX,
            });
            return newProject;
        }
        catch (error) {
            console.error(error);
            this.error = error instanceof Error ? error.message : 'An unknown error occurred';
        }
    }

    /**
     * 创建本地 VSCode 项目（legacy 方法，保留备用）
     * 实际 Entry 1 流程已移至 LocalProjectModal 组件
     * TODO: 如不再使用可删除
     */
    async startCreateLocal(userId: string, projectName: string) {
        this.error = null;
        try {
            if (!userId) {
                console.error('No user ID found');
                return;
            }

            const project = createDefaultProject({
                overrides: {
                    name: projectName,
                },
            });

            // 本地环境创建：不需要 sandboxId 和 sandboxUrl
            const newProject = await api.project.create.mutate({
                project,
                userId,
                environment: ProjectEnvironment.LOCAL_VSCODE,
                localConfig: DEFAULT_LOCAL_CONFIG,
            });

            // TODO: Phase 4 - 生成 vscode:// URI 并打开
            // 生成 token，构造 URI: vscode://onlook.onlook-local/createProject?token=xxx&projectId=xxx
            console.info('[CreateManager] 本地项目已创建，等待 VSCode 扩展连接', newProject);

            return newProject;
        }
        catch (error) {
            console.error(error);
            this.error = error instanceof Error ? error.message : 'An unknown error occurred';
        }
    }

    async createSandboxFromGithub(repoUrl: string, branch: string) {
        return await api.sandbox.createFromGitHub.mutate({
            repoUrl,
            branch
        });
    }
}

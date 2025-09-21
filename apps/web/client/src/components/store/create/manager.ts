import { api } from '@/trpc/client';
import { SandboxTemplates, Templates } from '@onlook/constants';
import { createDefaultProject } from '@onlook/db';
import { CreateRequestContextType } from '@onlook/models';
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
            });
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


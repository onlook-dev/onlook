import { api } from '@/trpc/client';
import { CSB_BLANK_TEMPLATE_ID } from '@onlook/constants';
import type { Project as DbProject } from '@onlook/db';
import type { ImageMessageContext } from '@onlook/models/chat';
import { makeAutoObservable } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { parseRepoUrl } from '../editor/pages/helper';

export class CreateManager {
    pendingCreationData: {
        userId: string;
        project: DbProject;
        prompt: string;
        images: ImageMessageContext[];
    } | null = null;

    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    async startCreate(userId: string, prompt: string, images: ImageMessageContext[]) {
        this.error = null;
        try {
            if (!userId) {
                console.error('No user ID found');
                return;
            }
            const { sandboxId, previewUrl } = await this.createSandbox();
            const project = await this.createDefaultProject(sandboxId, previewUrl);
            const newProject = await api.project.create.mutate({
                project,
                userId,
            });

            this.pendingCreationData = {
                userId,
                project: newProject,
                prompt,
                images,
            };
            return newProject;
        }
        catch (error) {
            console.error(error);
            this.error = error instanceof Error ? error.message : 'An unknown error occurred';
        }
    }

    createDefaultProject(sandboxId: string, previewUrl: string): DbProject {
        const newProject = {
            id: uuidv4(),
            name: 'New project',
            sandboxId,
            sandboxUrl: previewUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
            previewImgUrl: null,
            previewImgPath: null,
            previewImgBucket: null,
            description: 'Your new project',
        } satisfies DbProject;
        return newProject;
    }

    async startGithubTemplate(userId: string, repoUrl: string){
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

            if(isPrivateRepo){
                this.error = "The repository you've provided is private. Only public repositories are supported";
                return;
            }

            const { sandboxId, previewUrl } = await this.createSandboxFromGithub(repoUrl, branch);
            const project = await this.createDefaultProject(sandboxId, previewUrl);
            const newProject = await api.project.create.mutate({
                project,
                userId,
            });

            this.pendingCreationData = {
                userId,
                project: newProject,
                prompt: "",
                images: [],
            };
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


    async createSandbox() {
        return await api.sandbox.fork.mutate({
            sandboxId: CSB_BLANK_TEMPLATE_ID,
        });
    }

}


import type { ImageMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import { ProjectTabs, type ProjectsManager } from '.';
import { invokeMainChannel } from '../utils';

export enum CreateState {
    PROMPT = 'prompting',
    IMPORT = 'import',
    CREATE_LOADING = 'create-loading',
    ERROR = 'error',
}

export class CreateManager {
    createState: CreateState = CreateState.PROMPT;
    progress: number = 0;
    message: string | null = null;
    error: string | null = null;
    private cleanupListener: (() => void) | null = null;

    constructor(private projectsManager: ProjectsManager) {
        makeAutoObservable(this);
        this.listenForPromptProgress();
    }

    listenForPromptProgress() {
        window.api.on(
            MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK,
            ({ message, progress }: { message: string; progress: number }) => {
                this.progress = progress;
                this.message = message;
            },
        );

        this.cleanupListener = () => {
            window.api.removeAllListeners(MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK);
        };

        return this.cleanupListener;
    }

    get state() {
        return this.createState;
    }

    set state(newState: CreateState) {
        this.createState = newState;
    }

    async sendPrompt(prompt: string, images: ImageMessageContext[]) {
        this.state = CreateState.CREATE_LOADING;
        this.error = null;
        const result: {
            success: boolean;
            projectPath?: string;
            error?: string;
        } = await invokeMainChannel(MainChannels.CREATE_NEW_PROJECT_PROMPT, {
            prompt: prompt,
            images: images,
        });

        if (result.success && result.projectPath) {
            this.state = CreateState.PROMPT;
            this.projectsManager.projectsTab = ProjectTabs.PROJECTS;
            const newProject = this.createProject(result.projectPath);
            this.projectsManager.project = newProject;
            setTimeout(() => {
                this.projectsManager.runner?.start();
            }, 1000);
        } else {
            this.error = result.error || 'Failed to create project';
            this.state = CreateState.ERROR;
        }
    }

    createProject(projectPath: string) {
        const projectName = 'New Project';
        const projectUrl = 'http://localhost:3000';
        const projectCommands = {
            run: 'npm run dev',
            build: 'npm run build',
        };

        return this.projectsManager.createProject(
            projectName,
            projectUrl,
            projectPath,
            projectCommands,
        );
    }

    cleanup() {
        if (this.cleanupListener) {
            this.cleanupListener();
            this.cleanupListener = null;
        }
    }
}

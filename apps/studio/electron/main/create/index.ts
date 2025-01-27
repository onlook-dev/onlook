import { createProject, CreateStage, type CreateCallback } from '@onlook/foundation';
import type { ImageMessageContext, StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { mainWindow } from '..';
import Chat from '../chat';

export class ProjectCreator {
    private static instance: ProjectCreator;
    private abortController: AbortController | null = null;

    private constructor() {}

    public static getInstance(): ProjectCreator {
        if (!ProjectCreator.instance) {
            ProjectCreator.instance = new ProjectCreator();
        }
        return ProjectCreator.instance;
    }

    public async createProject(
        prompt: string,
        images: ImageMessageContext[],
    ): Promise<{
        success: boolean;
        error?: string;
        projectPath?: string;
        cancelled?: boolean;
    }> {
        this.cancel();
        this.abortController = new AbortController();

        try {
            const [generatedPage, projectPath] = await Promise.all([
                this.generatePage(prompt, images),
                this.runCreate(),
            ]);

            if (this.abortController.signal.aborted) {
                return { success: false, cancelled: true };
            }

            await this.applyGeneratedPage(projectPath, generatedPage);
            return { success: true, projectPath };
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            console.error('Failed to create project:', error);
            return { success: false, error: (error as Error).message };
        } finally {
            this.abortController = null;
        }
    }

    public cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private async generatePage(prompt: string, images: ImageMessageContext[]) {
        if (!this.abortController) {
            throw new Error('No active creation process');
        }

        const defaultPagePath = 'app/page.tsx';
        const systemPrompt = `You are an expert React developer specializing in React and Tailwind CSS. You are given a prompt and you need to create a React page that matches the prompt. Try to use a distinct style and infer it from the prompt. Err on the side of being quirky and unique.
IMPORTANT: 
- Output only the code without any explanation or markdown formatting. The content will be injected into the page so make sure it is valid React code.
- Don't use any dependencies or libraries besides tailwind.
- Make sure to add import statements for any dependencies you use.`;

        const messages = this.getMessages(prompt, images);
        this.emitPromptProgress('Generating page...', 10);

        const response = await Chat.stream(messages, systemPrompt, this.abortController);

        if (response.status !== 'full') {
            throw new Error('Failed to generate page. ' + this.getStreamErrorMessage(response));
        }

        return {
            path: defaultPagePath,
            content: response.content,
        };
    }

    private async runCreate() {
        if (!this.abortController) {
            throw new Error('No active creation process');
        }

        if (this.abortController.signal.aborted) {
            throw new Error('AbortError');
        }

        const documentsPath = app.getPath('documents');
        const projectsPath = path.join(documentsPath, 'Onlook', 'Projects');
        await fs.promises.mkdir(projectsPath, { recursive: true });
        const projectName = `project-${Date.now()}`;

        await createProject(projectName, projectsPath, this.createCallback.bind(this));
        return path.join(projectsPath, projectName);
    }

    private createCallback: CreateCallback = (stage: CreateStage, message: string) => {
        let progress = 0;
        switch (stage) {
            case CreateStage.CLONING:
                progress = 20;
                break;
            case CreateStage.GIT_INIT:
                progress = 30;
                break;
            case CreateStage.INSTALLING:
                progress = 40;
                break;
            case CreateStage.COMPLETE:
                progress = 80;
                this.emitPromptProgress('Project created! Generating page...', progress);
                return;
        }
        this.emitPromptProgress(message, progress);
    };

    private emitPromptProgress = (message: string, progress: number) => {
        mainWindow?.webContents.send(MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK, {
            message,
            progress,
        });
    };

    private getMessages(prompt: string, images: ImageMessageContext[]): CoreMessage[] {
        const defaultPageContent = `'use client';
        
export default function Page() {
    return (
      <div></div>
    );
}`;

        const promptContent = `${images.length > 0 ? 'Refer to the images above. ' : ''}Create a landing page that matches this description: ${prompt}
Use this as the starting template:
${defaultPageContent}`;

        // For text-only messages
        if (images.length === 0) {
            return [
                {
                    role: 'user',
                    content: promptContent,
                },
            ];
        }

        // For messages with images
        return [
            {
                role: 'user',
                content: [
                    ...images.map((image) => ({
                        type: 'image' as const,
                        image: image.content,
                        mimeType: image.mimeType,
                    })),
                    {
                        type: 'text' as const,
                        text: promptContent,
                    },
                ],
            },
        ];
    }

    private async applyGeneratedPage(
        projectPath: string,
        generatedPage: { path: string; content: string },
    ): Promise<void> {
        const pagePath = path.join(projectPath, generatedPage.path);
        // Create recursive directories if they don't exist
        await fs.promises.mkdir(path.dirname(pagePath), { recursive: true });
        await fs.promises.writeFile(pagePath, generatedPage.content);
    }

    private getStreamErrorMessage(streamResult: StreamResponse): string {
        if (streamResult.status === 'error') {
            return streamResult.content;
        }

        if (streamResult.status === 'partial') {
            return streamResult.content;
        }

        if (streamResult.status === 'rate-limited') {
            if (streamResult.rateLimitResult) {
                const requestLimit =
                    streamResult.rateLimitResult.reason === 'daily'
                        ? streamResult.rateLimitResult.daily_requests_limit
                        : streamResult.rateLimitResult.monthly_requests_limit;

                return `You reached your ${streamResult.rateLimitResult.reason} ${requestLimit} message limit.`;
            }
            return 'Rate limit exceeded. Please try again later.';
        }

        return 'Unknown error';
    }
}

export default ProjectCreator.getInstance();

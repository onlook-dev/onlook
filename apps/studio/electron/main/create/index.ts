import { extractCodeBlocks } from '@onlook/ai/src/coder';
import { PAGE_SYSTEM_PROMPT, PromptProvider } from '@onlook/ai/src/prompt';
import { CreateStage, type CreateCallback, type CreateProjectResponse } from '@onlook/models';
import {
    StreamRequestType,
    type ErrorStreamResponse,
    type ImageMessageContext,
    type PartialStreamResponse,
    type RateLimitedStreamResponse,
} from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage, CoreSystemMessage } from 'ai';
import fs from 'fs';
import path from 'path';
import { mainWindow } from '..';
import Chat from '../chat';
import { getCreateProjectPath } from './helpers';
import { createProject } from './install';
import { LintingService } from '@onlook/foundation/src/linting';

export class ProjectCreator {
    private static instance: ProjectCreator;
    private abortController: AbortController | null = null;

    public static getInstance(): ProjectCreator {
        if (!ProjectCreator.instance) {
            ProjectCreator.instance = new ProjectCreator();
        }
        return ProjectCreator.instance;
    }

    private async executeProjectCreation<T>(action: () => Promise<T>): Promise<{
        success: boolean;
        error?: string;
        response?: T;
        cancelled?: boolean;
    }> {
        this.cancel();
        this.abortController = new AbortController();

        try {
            const result = await action();
            return { success: true, response: result };
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

    public async createProject(
        prompt: string,
        images: ImageMessageContext[],
    ): Promise<CreateProjectResponse> {
        return this.executeProjectCreation(async () => {
            const [generatedPage, projectPath] = await Promise.all([
                this.generatePage(prompt, images),
                this.runCreate(),
            ]);

            if (this.abortController?.signal.aborted) {
                throw new Error('AbortError');
            }

            // Apply the generated page with linting
            await this.applyGeneratedPage(projectPath, generatedPage);

            // Run a full project lint
            const lintingService = LintingService.getInstance();
            const lintSummary = await lintingService.lintProject(projectPath);

            this.emitPromptProgress(
                `Project linting completed: ${lintSummary.totalErrors} errors, ${
                    lintSummary.totalWarnings
                } warnings, ${lintSummary.fixedFiles} files auto-fixed`,
                95,
            );

            return { projectPath, content: generatedPage.content };
        });
    }

    public async createBlankProject(): Promise<CreateProjectResponse> {
        return this.executeProjectCreation(async () => {
            const projectPath = await this.runCreate();
            return { projectPath, content: '' };
        });
    }

    public cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private async generatePage(
        prompt: string,
        images: ImageMessageContext[],
    ): Promise<{ path: string; content: string }> {
        if (!this.abortController) {
            throw new Error('No active creation process');
        }

        const messages = this.getMessages(prompt, images);
        this.emitPromptProgress('Generating page...', 10);
        const systemPrompt = new PromptProvider().getCreatePageSystemPrompt();
        const systemMessage: CoreSystemMessage = {
            role: 'system',
            content: systemPrompt,
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };

        const response = await Chat.stream([systemMessage, ...messages], StreamRequestType.CREATE, {
            abortController: this.abortController,
            skipSystemPrompt: true,
        });

        if (response.type !== 'full') {
            throw new Error('Failed to generate page. ' + this.getStreamErrorMessage(response));
        }

        const content = extractCodeBlocks(response.text);

        return {
            path: PAGE_SYSTEM_PROMPT.defaultPath,
            content,
        };
    }

    private async runCreate(): Promise<string> {
        if (!this.abortController) {
            throw new Error('No active creation process');
        }

        if (this.abortController.signal.aborted) {
            throw new Error('AbortError');
        }

        const projectsPath = getCreateProjectPath();
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
                progress = 50;
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
        const promptContent = `${images.length > 0 ? 'Refer to the images above. ' : ''}Create a landing page that matches this description: ${prompt}
Use this as the starting template:
${PAGE_SYSTEM_PROMPT.defaultContent}`;

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
        const fullPath = path.join(projectPath, generatedPage.path);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

        // Lint and fix the generated content
        const lintingService = LintingService.getInstance();
        const lintResult = await lintingService.lintAndFix(fullPath, generatedPage.content);

        // Write the linted content
        await fs.promises.writeFile(fullPath, lintResult.output || generatedPage.content);

        // Report linting results
        if (lintResult.messages.length > 0) {
            const errors = lintResult.messages.filter((m) => m.severity === 2);
            const warnings = lintResult.messages.filter((m) => m.severity === 1);

            this.emitPromptProgress(
                `Linting completed: ${errors.length} errors, ${warnings.length} warnings${
                    lintResult.fixed ? ' (auto-fixed)' : ''
                }`,
                90,
            );
        } else {
            this.emitPromptProgress('Linting completed: No issues found', 90);
        }
    }

    private getStreamErrorMessage(
        streamResult: PartialStreamResponse | ErrorStreamResponse | RateLimitedStreamResponse,
    ): string {
        if (streamResult.type === 'error') {
            return streamResult.message;
        }

        if (streamResult.type === 'rate-limited') {
            if (streamResult.rateLimitResult) {
                const requestLimit =
                    streamResult.rateLimitResult.reason === 'daily'
                        ? streamResult.rateLimitResult.daily_requests_limit
                        : streamResult.rateLimitResult.monthly_requests_limit;

                return `You reached your ${streamResult.rateLimitResult.reason} ${requestLimit} message limit.`;
            }
            return 'Rate limit exceeded. Please try again later.';
        }

        if (streamResult.type === 'partial') {
            return 'Returned partial response';
        }

        return 'Unknown error';
    }
}

export default ProjectCreator.getInstance();

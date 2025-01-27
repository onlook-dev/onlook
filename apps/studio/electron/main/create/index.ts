import { createProject, CreateStage, type CreateCallback } from '@onlook/foundation';
import type { ImageMessageContext, StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { mainWindow } from '..';
import Chat from '../chat';

export async function createProjectPrompt(
    prompt: string,
    images: ImageMessageContext[],
): Promise<{
    success: boolean;
    error?: string;
    projectPath?: string;
}> {
    try {
        const [generatedPage, projectPath] = await Promise.all([
            generatePage(prompt, images),
            runCreate(),
        ]);

        // Apply the generated page to the project
        await applyGeneratedPage(projectPath, generatedPage);
        return { success: true, projectPath };
    } catch (error) {
        console.error('Failed to create project:', error);
        return { success: false, error: (error as Error).message };
    }
}

async function generatePage(prompt: string, images: ImageMessageContext[]) {
    const defaultPagePath = 'app/page.tsx';

    // TODO: Allow running command to install more dependencies
    const systemPrompt = `You are an expert React developer specializing in React and Tailwind CSS. You are given a prompt and you need to create a React page that matches the prompt.
IMPORTANT: 
- Output only the code without any explanation or markdown formatting. The content will be injected into the page so make sure it is valid React code.
- Don't use any dependencies or libraries besides tailwind.`;

    const messages = getMessages(prompt, images);
    emitPromptProgress('Generating page...', 10);

    const response = await Chat.stream(messages, systemPrompt);

    if (response.status !== 'full') {
        throw new Error('Failed to generate page. ' + getStreamErrorMessage(response));
    }

    return {
        path: defaultPagePath,
        content: response.content,
    };
}

function getMessages(prompt: string, images: ImageMessageContext[]): CoreMessage[] {
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

async function runCreate() {
    // Get the documents folder based on platform
    const documentsPath = app.getPath('documents');
    const projectsPath = path.join(documentsPath, 'Onlook', 'Projects');

    // Create the directory if it doesn't exist
    await fs.promises.mkdir(projectsPath, { recursive: true });

    // Create a new project directory with a unique name
    const projectName = `project-${Date.now()}`;

    await createProject(projectName, projectsPath, createCallback);
    return path.join(projectsPath, projectName);
}

const createCallback: CreateCallback = (stage: CreateStage, message: string) => {
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
            emitPromptProgress('Project created! Generating page...', progress);
            return;
    }
    emitPromptProgress(message, progress);
};

const emitPromptProgress = (message: string, progress: number) => {
    mainWindow?.webContents.send(MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK, {
        message,
        progress,
    });
};

async function applyGeneratedPage(
    projectPath: string,
    generatedPage: { path: string; content: string },
): Promise<void> {
    const pagePath = path.join(projectPath, generatedPage.path);
    // Create recursive directories if they don't exist
    await fs.promises.mkdir(path.dirname(pagePath), { recursive: true });
    await fs.promises.writeFile(pagePath, generatedPage.content);
}

function getStreamErrorMessage(streamResult: StreamResponse): string {
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

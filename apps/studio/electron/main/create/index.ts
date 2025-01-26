import { createProject, CreateStage, type CreateCallback } from '@onlook/foundation';
import type { ImageMessageContext } from '@onlook/models/chat';
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
}> {
    try {
        const [generatedPage, projectPath] = await Promise.all([
            generatePage(prompt, images),
            runCreate(),
        ]);

        // Apply the generated page to the project
        await applyGeneratedPage(projectPath, generatedPage);
        return { success: true };
    } catch (error) {
        console.error('Failed to create project:', error);
        return { success: false, error: (error as Error).message };
    }
}

async function generatePage(prompt: string, images: ImageMessageContext[]) {
    const defaultPagePath = 'app/page.tsx';
    const defaultPageContent = `'use client';

export default function Page() {
    return (
      <div></div>
    );
}`;

    const systemPrompt = `You are an expert React developer specializing in React and Tailwind CSS. You are given a prompt and you need to create a React page that matches the prompt.
IMPORTANT: Output only the code without any explanation or markdown formatting. The content will be injected into the page so make sure it is valid React code.
`;
    const messages: CoreMessage[] = [
        {
            role: 'user',
            content: `Create a landing page that matches this description: ${prompt}
Use this as the starting template:
${defaultPageContent} `,
        },
    ];

    const response = await Chat.stream(messages, systemPrompt);

    if (response.status !== 'full') {
        throw new Error('Failed to generate page');
    }

    return {
        path: defaultPagePath,
        content: response.content,
    };
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
    mainWindow?.webContents.send(MainChannels.CREATE_NEW_PROJECT_CALLBACK, {
        stage,
        message,
    });
    console.log(`Create stage: ${stage}, message: ${message} `);
};

async function applyGeneratedPage(
    projectPath: string,
    generatedPage: { path: string; content: string },
): Promise<void> {
    const pagePath = path.join(projectPath, generatedPage.path);
    // Create recursive directories if they don't exist
    await fs.promises.mkdir(path.dirname(pagePath), { recursive: true });
    await fs.promises.writeFile(pagePath, generatedPage.content);
    console.log('Generated page applied to project:', pagePath);
}

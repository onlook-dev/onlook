import { createProject, CreateStage, type CreateCallback } from '@onlook/foundation';
import type { ImageMessageContext } from '@onlook/models/chat';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { mainWindow } from '..';
import { MainChannels } from '../../../../../packages/models/src/constants/ipc';

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
      <div>TEST</div>
    );
}`;
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
        path: defaultPagePath,
        content: defaultPageContent,
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
    console.log(`Create stage: ${stage}, message: ${message}`);
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

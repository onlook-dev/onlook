import type { ImageMessageContext } from '@onlook/models/chat';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

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
            setupProject(),
        ]);

        // Apply the generated page to the project
        await applyGeneratedPage(projectPath, generatedPage);
        console.log('Project created successfully:', projectPath);
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
        path: defaultPagePath,
        content: defaultPageContent,
    };
}

async function setupProject() {
    // Get the documents folder based on platform
    const documentsPath = app.getPath('documents');
    const projectPath = path.join(documentsPath, 'Onlook', 'Projects');

    // Create the directory if it doesn't exist
    await fs.promises.mkdir(projectPath, { recursive: true });

    console.log('Project path:', projectPath);
    // Create a new project directory with a unique name
    let projectNumber = 1;
    let projectDir = path.join(projectPath, `project-${projectNumber}`);

    // Keep incrementing until we find an unused project name
    while (fs.existsSync(projectDir)) {
        projectNumber++;
        projectDir = path.join(projectPath, `project-${projectNumber}`);
    }

    await fs.promises.mkdir(projectDir);
    return projectDir;
}

async function applyGeneratedPage(
    projectPath: string,
    generatedPage: { path: string; content: string },
): Promise<void> {
    const pagePath = path.join(projectPath, generatedPage.path);
    // Create recursive directories if they don't exist
    await fs.promises.mkdir(path.dirname(pagePath), { recursive: true });
    await fs.promises.writeFile(pagePath, generatedPage.content);
}

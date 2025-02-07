import { CreateStage, type CreateCallback } from '@onlook/models';
import download from 'download';
import * as fs from 'fs';
import * as path from 'path';
import { runBunCommand } from '../bun';

export async function createProject(
    projectName: string,
    targetPath: string,
    onProgress: CreateCallback,
): Promise<void> {
    try {
        const fullPath = path.join(targetPath, projectName);

        // Check if the directory already exists
        if (fs.existsSync(fullPath)) {
            throw new Error(
                `Directory ${fullPath} already exists. Please import it to Onlook or go back to create a different folder.`,
            );
        }

        onProgress(CreateStage.CLONING, `Cloning template...`);
        await downloadTemplate(fullPath);

        // Install dependencies
        await runBunCommand('npm install -y --no-audit --no-fund', {
            cwd: fullPath,
            callbacks: {
                onStdout: (data) =>
                    onProgress(
                        CreateStage.INSTALLING,
                        'Installing dependencies. This may take a few minutes...',
                    ),
            },
        });

        onProgress(CreateStage.COMPLETE, 'Project created successfully!');
    } catch (error) {
        onProgress(CreateStage.ERROR, `Project creation failed: ${error}`);
        throw error;
    }
}

async function downloadTemplate(fullPath: string) {
    try {
        const zipUrl = `https://github.com/onlook-dev/starter/archive/refs/heads/main.zip`;
        await download(zipUrl, fullPath, {
            extract: true,
            strip: 1,
            retry: 3,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(`Failed to download and extract template: ${error.message}`);
        }
        throw new Error('Failed to download and extract template: Unknown error');
    }
}

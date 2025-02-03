import { CreateStage, type CreateCallback } from '@onlook/models';
import degit from 'degit';
import * as fs from 'fs';
import * as path from 'path';
import { runBunCommand } from '../bun';

const NEXT_TEMPLATE_REPO = 'onlook-dev/starter';

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
        await cloneWithDegit(fullPath);

        // Install dependencies
        await runBunCommand('npm install -y --no-audit --no-fund', [], {
            cwd: fullPath,
            callbacks: {
                onStdout: (data) => onProgress(CreateStage.INSTALLING, data),
                onStderr: (data) => onProgress(CreateStage.INSTALLING, data),
            },
        });

        onProgress(CreateStage.COMPLETE, 'Project created successfully!');
    } catch (error) {
        onProgress(CreateStage.ERROR, `Project creation failed: ${error}`);
        throw error;
    }
}

async function cloneWithDegit(fullPath: string) {
    const emitter = degit(NEXT_TEMPLATE_REPO, {
        cache: false,
        force: true,
        verbose: true,
    });

    await emitter.clone(fullPath);
}

import { exec } from 'child_process';
import degit from 'degit';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CreateStage, type CreateCallback } from '..';

const NEXT_TEMPLATE_REPO = 'onlook-dev/starter';
const execAsync = promisify(exec);

export async function createProject(
    projectName: string,
    targetPath: string,
    onProgress: CreateCallback
): Promise<void> {

    try {
        const fullPath = path.join(targetPath, projectName);
        // Check if the directory already exists
        if (fs.existsSync(fullPath)) {
            throw new Error(`Directory ${fullPath} already exists.`);
        }

        // Clone the template using degit
        onProgress(CreateStage.CLONING, `Cloning template...`);
        const emitter = degit(NEXT_TEMPLATE_REPO, {
            cache: false,
            force: true,
            verbose: true,
        });

        await emitter.clone(fullPath);

        // Change to the project directory
        process.chdir(fullPath);

        // Install dependencies
        onProgress(CreateStage.INSTALLING, 'Installing dependencies...');
        await execAsync('npm install');

        onProgress(CreateStage.COMPLETE, 'Project created successfully!');
    } catch (error) {
        onProgress(CreateStage.ERROR, `Project creation failed: ${error}`);
        throw error;
    }
}


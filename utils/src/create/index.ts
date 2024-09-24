import { exec } from 'child_process';
import degit from 'degit';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CreateStage, type CreateCallback } from '..';

const NEXT_TEMPLATE_REPO = 'onlook-dev/starter';
const execAsync = promisify(exec);

async function checkCommandExists(command: string): Promise<boolean> {
    try {
        await execAsync(`${command} --version`);
        return true;
    } catch (error) {
        return false;
    }
}

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

        // Initialize git repository
        const gitExists = await checkCommandExists('git');
        if (gitExists) {
            onProgress(CreateStage.GIT_INIT, 'Initializing git repository...');
            await execAsync('git init');
            await execAsync('git add .');
            await execAsync('git commit -m "Initial commit"');
        } else {
            console.log('Git not found. Skipping git initialization.');
        }

        // Check if npm exists
        const npmExists = await checkCommandExists('npm');

        if (npmExists) {
            // Install dependencies
            onProgress(CreateStage.INSTALLING, 'Installing dependencies...');
            await execAsync('npm install -y --no-audit --no-fund');
        } else {
            onProgress(CreateStage.ERROR, 'npm not found. Please install npm and retry.');
            console.log('To install npm, you can:');
            console.log('1. Install Node.js (which includes npm) from https://nodejs.org/');
            console.log('2. Use a package manager like nvm (Node Version Manager)');
            console.log('After installing npm, run "npm install" in the project directory.');
            return;
        }

        onProgress(CreateStage.COMPLETE, 'Project created successfully!');
    } catch (error) {
        onProgress(CreateStage.ERROR, `Project creation failed: ${error}`);
        throw error;
    }
}
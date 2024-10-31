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
            throw new Error(`Directory ${fullPath} already exists. Please import it to Onlook or go back to create a different folder.`);
        }

        onProgress(CreateStage.CLONING, `Cloning template...`);
        await cloneRepo(fullPath, onProgress);

        // Change to the project directory
        process.chdir(fullPath);

        // Initialize empty git repository
        initGit(onProgress);

        // Check if npm exists
        const npmExists = await checkCommandExists('npm');

        if (npmExists) {
            // Install dependencies
            onProgress(CreateStage.INSTALLING, 'Installing dependencies...');
            await execAsync('npm install -y --no-audit --no-fund');
        } else {
            onProgress(CreateStage.ERROR, 'npm not found. Please install node from https://nodejs.org/ or manually run npm install on the project.');
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

async function initGit(onProgress: CreateCallback) {
    try {
        const gitExists = await checkCommandExists('git');
        if (gitExists) {
            onProgress(CreateStage.GIT_INIT, 'Initializing git repository...');
            await execAsync('git init');
            await execAsync('git add .');
            await execAsync('git commit -m "Initial commit"');
        } else {
            console.log('Git not found. Skipping git initialization.');
        }
    } catch (error) {
        onProgress(CreateStage.GIT_INIT, `Git initialization failed: ${error}`);
    }
}

async function cloneRepo(fullPath: string, onProgress: CreateCallback) {
    try {
        await cloneWithDegit(fullPath);
    } catch (error) {
        onProgress(CreateStage.CLONING, `Degit failed, falling back to git clone: ${error}`);

        try {
            await cloneWithGit(fullPath);
        } catch (gitError) {
            throw new Error(`Failed to clone repository: ${gitError}`);
        }
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

async function cloneWithGit(fullPath: string) {
    const gitExists = await checkCommandExists('git');
    if (!gitExists) {
        throw new Error('Git is not installed on this system.');
    }

    const gitUrl = `https://github.com/${NEXT_TEMPLATE_REPO}.git`;
    await execAsync(`git clone --depth 1 ${gitUrl} "${fullPath}"`);

    // Remove the .git directory to start fresh
    const gitDir = path.join(fullPath, '.git');
    if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true });
    }
}
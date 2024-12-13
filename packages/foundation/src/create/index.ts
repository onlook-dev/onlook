import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as extract from 'extract-zip';
import { promisify } from 'util';
import { CreateStage, type CreateCallback } from '..';

const TEMPLATE_DOWNLOAD_URL =
    'https://github.com/onlook-dev/starter-v1/archive/refs/heads/main.zip';
const execAsync = promisify(exec);

async function checkCommandExists(command: string): Promise<boolean> {
    try {
        await execAsync(`${command} --version`);
        return true;
    } catch (error) {
        return false;
    }
}

async function downloadTemplate(outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https
            .get(TEMPLATE_DOWNLOAD_URL, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download template: ${response.statusCode}`));
                    return;
                }

                const fileStream = fs.createWriteStream(outputPath);
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(outputPath);
                });

                fileStream.on('error', (err) => {
                    fs.unlink(outputPath, () => reject(err));
                });
            })
            .on('error', reject);
    });
}

export async function createProject(
    projectName: string,
    targetPath: string,
    onProgress: CreateCallback,
): Promise<void> {
    try {
        const fullPath = path.join(targetPath, projectName);
        if (fs.existsSync(fullPath)) {
            throw new Error(
                `Directory ${fullPath} already exists. Please import it to Onlook or go back to create a different folder.`,
            );
        }

        // Create temp directory for zip
        const tempDir = path.join(targetPath, '.onlook-temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const zipPath = path.join(tempDir, 'template.zip');

        // Download template
        onProgress(CreateStage.CLONING, 'Downloading template...');
        await downloadTemplate(zipPath);

        // Extract template
        onProgress(CreateStage.CLONING, 'Extracting template...');
        await extract(zipPath, { dir: tempDir });

        // Move extracted contents to target directory
        const extractedDir = path.join(tempDir, 'starter-v1-main');
        fs.renameSync(extractedDir, fullPath);

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        // Change to project directory
        process.chdir(fullPath);

        // Check if npm exists
        const npmExists = await checkCommandExists('npm');
        if (npmExists) {
            onProgress(CreateStage.INSTALLING, 'Installing dependencies...');
            await execAsync('npm install -y --no-audit --no-fund');
        } else {
            onProgress(
                CreateStage.ERROR,
                'npm not found. Please install node from https://nodejs.org/ or manually run npm install on the project.',
            );
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

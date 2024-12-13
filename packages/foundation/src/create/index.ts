import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CreateStage, type CreateCallback } from '..';
import type { IncomingMessage } from 'http';

const TEMPLATE_URL =
    'https://github.com/onlook-dev/onlook/releases/latest/download/starter-template.zip';
const execAsync = promisify(exec);

async function checkCommandExists(command: string): Promise<boolean> {
    try {
        await execAsync(`${command} --version`);
        return true;
    } catch (error) {
        return false;
    }
}

async function downloadTemplate(fullPath: string, onProgress: CreateCallback): Promise<string> {
    const https = require('https');
    const fs = require('fs');
    const zipPath = path.join(fullPath, 'template.zip');
    const templateUrl = process.env.TEMPLATE_URL || TEMPLATE_URL;

    return new Promise<string>((resolve, reject) => {
        if (templateUrl.startsWith('file://')) {
            const localPath = templateUrl.replace('file://', '');
            try {
                fs.copyFileSync(localPath, zipPath);
                resolve(zipPath);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                reject(new Error(`Failed to copy local template: ${errorMessage}`));
            }
            return;
        }

        https
            .get(templateUrl, (response: IncomingMessage) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }

                const fileStream = fs.createWriteStream(zipPath);
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(zipPath);
                });

                fileStream.on('error', (err: Error) => {
                    fs.unlink(zipPath, () => reject(err));
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

        fs.mkdirSync(fullPath, { recursive: true });

        onProgress(CreateStage.CLONING, `Downloading template...`);
        const zipPath = await downloadTemplate(fullPath, onProgress);

        try {
            onProgress(CreateStage.CLONING, `Extracting template...`);
            await execAsync(`unzip "${zipPath}" -d "${fullPath}"`);
        } finally {
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
        }

        process.chdir(fullPath);

        const npmExists = await checkCommandExists('npm');
        if (npmExists) {
            onProgress(CreateStage.INSTALLING, 'Installing dependencies...');
            await execAsync('npm install -y --no-audit --no-fund');
        } else {
            onProgress(
                CreateStage.ERROR,
                'npm not found. Please install node from https://nodejs.org/ or manually run npm install on the project.',
            );
            return;
        }

        onProgress(CreateStage.COMPLETE, 'Project created successfully!');
    } catch (error) {
        onProgress(CreateStage.ERROR, `Project creation failed: ${error}`);
        throw error;
    }
}

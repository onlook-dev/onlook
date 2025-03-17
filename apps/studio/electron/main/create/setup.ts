import { SetupStage, type SetupCallback } from '@onlook/models';
import { runBunCommand } from '../bun';
import fs from 'fs';
import path from 'path';

export const installProjectDependencies = async (
    targetPath: string,
    installCommand: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');
        const result = await runBunCommand(installCommand, {
            cwd: targetPath,
        });

        if (!result.success) {
            throw new Error(`Failed to install dependencies: ${result.error}`);
        }

        onProgress(SetupStage.COMPLETE, 'Project dependencies installed.');
    } catch (err) {
        console.error(err);
        onProgress(
            SetupStage.ERROR,
            err instanceof Error ? err.message : 'An unknown error occurred.',
        );
    }
};

export const reinstallProjectDependencies = async (
    targetPath: string,
    installCommand: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Cleaning up previous dependencies...');

        const nodeModulesPath = path.join(targetPath, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
            await fs.promises.rm(nodeModulesPath, { recursive: true, force: true });
        }

        const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
        for (const lockFile of lockFiles) {
            const lockPath = path.join(targetPath, lockFile);
            if (fs.existsSync(lockPath)) {
                await fs.promises.unlink(lockPath);
            }
        }

        onProgress(SetupStage.INSTALLING, 'Reinstalling packages...');
        const result = await runBunCommand(installCommand, {
            cwd: targetPath,
        });

        if (!result.success) {
            throw new Error(`Failed to reinstall dependencies: ${result.error}`);
        }

        onProgress(SetupStage.COMPLETE, 'Project dependencies reinstalled successfully.');
    } catch (err) {
        console.error(err);
        onProgress(
            SetupStage.ERROR,
            err instanceof Error ? err.message : 'An unknown error occurred during reinstallation.',
        );
    }
};

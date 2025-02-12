import { SetupStage, type SetupCallback } from '@onlook/models';
import { runBunCommand } from '../bun';

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

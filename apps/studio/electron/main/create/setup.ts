import { runBunCommand } from '../bun';
import { SetupStage, type SetupCallback } from './helpers';

export const installProjectDependencies = async (
    targetPath: string,
    installCommand: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');
        runBunCommand(installCommand, [], {
            cwd: targetPath,
            callbacks: {
                onStdout: (data) => onProgress(SetupStage.INSTALLING, data),
                onStderr: (data) => onProgress(SetupStage.INSTALLING, data),
                onClose: (code, signal) => {
                    if (code !== 0) {
                        onProgress(
                            SetupStage.ERROR,
                            `Failed to install dependencies. Code: ${code}, Signal: ${signal}`,
                        );
                    } else {
                        onProgress(SetupStage.COMPLETE, 'Project dependencies installed.');
                    }
                },
            },
        });
    } catch (err) {
        console.error(err);
        onProgress(
            SetupStage.ERROR,
            err instanceof Error ? err.message : 'An unknown error occurred.',
        );
    }
};

import { spawn } from 'child_process';
import { SetupStage, type SetupCallback } from '..';
import { Framework } from '../frameworks';

export const setupProject = async (
    targetPath: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        process.chdir(targetPath);
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');

        for (const framework of Framework.getAll()) {
            onProgress(
                SetupStage.INSTALLING,
                'Checking for' + framework.name + ' configuration...',
            );
            const updated = await framework.setup(onProgress);
            if (updated) {
                onProgress(SetupStage.COMPLETE, 'Project setup complete.');
                return;
            }
        }
        console.error(
            'Cannot determine the project framework.',
            '\nIf this is unexpected, see: https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F#do-it-manually',
        );
        onProgress(
            SetupStage.ERROR,
            'Cannot determine the project framework. Make sure this is a valid React project.',
        );
    } catch (err) {
        console.error(err);
        onProgress(SetupStage.ERROR, 'An error occurred.');
    }
};

export const installProjectDependencies = async (
    targetPath: string,
    installCommand: string,
    onProgress: SetupCallback,
): Promise<void> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');
        const child = spawn(installCommand, {
            cwd: targetPath,
            shell: true,
            stdio: ['inherit', 'pipe', 'pipe'],
        });
        child.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log('[stdout]:', output);
                onProgress(SetupStage.CONFIGURING, output);
            }
        });
        child.stderr.on('data', (data) => {
            const output = data.toString().trim();
            if (output) {
                console.log('[stderr]:', output);
                onProgress(SetupStage.ERROR, output);
            }
        });
        child.on('close', (code) => {
            if (code === 0) {
                console.log('Project dependencies installed.');
                onProgress(SetupStage.COMPLETE, 'Project dependencies installed.');
            } else {
                console.log('Failed to install project dependencies.');
                onProgress(SetupStage.ERROR, 'Failed to install project dependencies.');
            }
        });
    } catch (err) {
        console.error(err);
        onProgress(SetupStage.ERROR, 'An error occurred.');
    }
};

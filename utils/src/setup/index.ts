import { SetupStage, type SetupCallback } from '..';
import { Framework } from '../frameworks';

export const setupProject = async (targetPath: string, onProgress: SetupCallback): Promise<void> => {
    try {
        process.chdir(targetPath);
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');

        for (const framework of Framework.getAll()) {
            onProgress(SetupStage.INSTALLING, 'Checking for' + framework.name + ' configuration...');
            const updated = await framework.setup(onProgress);
            if (updated) {
                onProgress(SetupStage.COMPLETE, 'Project setup complete.');
                return;
            }
        }
        console.error('Cannot determine the project framework.', '\nIf this is unexpected, see: https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F#do-it-manually');
        onProgress(SetupStage.ERROR, 'Cannot determine the project framework. Make sure this is a valid React project.');
    } catch (err) {
        console.error(err);
        onProgress(SetupStage.ERROR, 'An error occurred.');
    }
};

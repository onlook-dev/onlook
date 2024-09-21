import { SetupStage, type SetupCallback } from '..';
import { Framework } from '../frameworks';

export const setupProject = async (targetPath: string, onProgress: SetupCallback): Promise<boolean> => {
    try {
        onProgress(SetupStage.INSTALLING, 'Installing required packages...');

        for (const framework of Framework.getAll()) {
            onProgress(SetupStage.INSTALLING, 'Checking for' + framework.name + ' configuration...');
            const updated = await framework.setup(targetPath, onProgress);
            if (updated) {
                onProgress(SetupStage.COMPLETE, 'Project setup complete.');
                return true;
            }
        }
        console.error('Cannot determine the project framework.', '\nIf this is unexpected, see: https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F#do-it-manually');
        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
};

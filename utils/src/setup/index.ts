import type { SetupCallback } from '..';
import { Framework } from './frameworks';

export const setupProject = async (targetPath: string, onProgress: SetupCallback): Promise<void> => {
    try {
        for (const framework of Framework.getAll()) {
            const updated = await framework.run();
            if (updated) {
                return;
            }
        }
        console.warn('Cannot determine the project framework.', '\nIf this is unexpected, see: https://github.com/onlook-dev/onlook/wiki/How-to-set-up-my-project%3F#do-it-manually');
    } catch (err) {
        console.error(err);
    }
};

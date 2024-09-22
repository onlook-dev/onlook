import { VerifyStage, type VerifyCallback } from '..';
import { ONLOOK_PLUGIN } from '../constants';
import { hasDependency } from '../utils';

export const verifyProject = async (targetPath: string, onProgress: VerifyCallback): Promise<void> => {
    try {
        for (const dep of [ONLOOK_PLUGIN.BABEL, ONLOOK_PLUGIN.NEXTJS]) {
            onProgress(VerifyStage.CHECKING, `Checking for ${dep}`);
            if (await hasDependency(dep, targetPath)) {
                onProgress(VerifyStage.INSTALLED, `Found ${dep}`);
                return;
            }
        }
        onProgress(VerifyStage.NOT_INSTALLED, 'No Onlook dependencies found.');
    } catch (err) {
        console.error(err);
    }
};

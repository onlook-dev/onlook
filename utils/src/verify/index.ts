import { VerifyStage, type VerifyCallback } from '..';
import { ONLOOK_PLUGIN } from '../constants';
import { hasDependency } from '../utils';

export const verifyProject = async (targetPath: string, onProgress: VerifyCallback): Promise<boolean> => {
    try {
        for (const dep of [ONLOOK_PLUGIN.BABEL, ONLOOK_PLUGIN.NEXTJS]) {
            onProgress(VerifyStage.CHECKING, `Checking for ${dep}`);
            if (await hasDependency(dep, targetPath)) {
                onProgress(VerifyStage.COMPLETE, `Found ${dep}`);
                return true;
            }
        }
        onProgress(VerifyStage.COMPLETE, 'No Onlook dependencies found.');
        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
};

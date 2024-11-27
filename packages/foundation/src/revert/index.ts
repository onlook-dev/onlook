import { removeDependencies, removeNextConfig, removeViteConfig } from 'src/frameworks/remove';
import { ONLOOK_PLUGIN } from '../constants';
import { hasDependency } from '../utils';

export const revertLegacyOnlook = async (targetPath: string): Promise<boolean> => {
    try {
        await removePlugins(targetPath);
        await removeNpmDependencies(targetPath);
        return !(await onlookFound(targetPath));
    } catch (e: any) {
        console.error(e);
        return false;
    }
};

export const onlookFound = async (targetPath: string): Promise<boolean> => {
    try {
        return (
            await hasDependency(ONLOOK_PLUGIN.BABEL, targetPath) ||
            await hasDependency(ONLOOK_PLUGIN.NEXTJS, targetPath) ||
            await hasDependency(ONLOOK_PLUGIN.WEBPACK, targetPath)
        );
    } catch (e: any) {
        console.error(e);
        return false;
    }
};

export const removePlugins = async (targetPath: string): Promise<void> => {
    await removeNextConfig(targetPath);
    await removeViteConfig(targetPath);
};

export const removeNpmDependencies = async (targetPath: string): Promise<void> => {
    await removeDependencies(targetPath, [ONLOOK_PLUGIN.BABEL, ONLOOK_PLUGIN.NEXTJS, ONLOOK_PLUGIN.WEBPACK]);
};

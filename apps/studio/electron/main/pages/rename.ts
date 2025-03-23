import { promises as fs } from 'fs';
import * as path from 'path';
import { detectRouterType, ROOT_PATH_IDENTIFIERS } from './helpers';

export async function renameNextJsPage(
    projectRoot: string,
    oldPath: string,
    newName: string,
): Promise<boolean> {
    try {
        const routerConfig = await detectRouterType(projectRoot);
        if (!routerConfig || routerConfig.type !== 'app') {
            throw new Error('Page renaming is only supported for App Router projects.');
        }

        if (ROOT_PATH_IDENTIFIERS.includes(oldPath)) {
            throw new Error('Cannot rename root page');
        }

        const oldFullPath = path.join(routerConfig.basePath, oldPath);
        const parentDir = path.dirname(oldFullPath);
        const newFullPath = path.join(parentDir, newName);

        // Check if source exists
        if (
            !(await fs
                .access(oldFullPath)
                .then(() => true)
                .catch(() => false))
        ) {
            throw new Error(`Source page not found: ${oldFullPath}`);
        }

        // Check if target already exists
        if (
            await fs
                .access(newFullPath)
                .then(() => true)
                .catch(() => false)
        ) {
            throw new Error(`Target path already exists: ${newFullPath}`);
        }

        // Add a small delay to ensure any file operations are complete
        await new Promise((resolve) => setTimeout(resolve, 200));

        await fs.rename(oldFullPath, newFullPath);

        return true;
    } catch (error) {
        console.error('Error renaming page:', error);
        throw error;
    }
}

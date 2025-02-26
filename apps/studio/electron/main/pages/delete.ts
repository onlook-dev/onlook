import { promises as fs } from 'fs';
import * as path from 'path';
import { cleanupEmptyFolders, detectRouterType } from './helpers';

export async function deleteNextJsPage(projectRoot: string, pagePath: string, isDir: boolean) {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            throw new Error('Could not detect Next.js router type');
        }

        if (routerConfig.type !== 'app') {
            throw new Error('Page deletion is only supported for App Router projects for now.');
        }

        const fullPath = path.join(routerConfig.basePath, pagePath);

        // Check if file/folder exists
        let stats;
        try {
            stats = await fs.stat(fullPath);
        } catch (err) {
            if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
                throw new Error('Selected page not found');
            }
            throw err;
        }

        if (isDir) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            const selectedFilePath = path.join(fullPath, 'page.tsx');
            await fs.unlink(selectedFilePath);
            await cleanupEmptyFolders(path.dirname(fullPath));
        }

        console.log(`Deleted: ${fullPath}`);
        return true;
    } catch (error) {
        console.error('Error deleting page:', error);
        throw error;
    }
}

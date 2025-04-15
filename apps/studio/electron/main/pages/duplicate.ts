import { promises as fs } from 'fs';
import * as path from 'path';
import { detectRouterType, ROOT_PAGE_COPY_NAME, ROOT_PATH_IDENTIFIERS } from './helpers';

async function getUniqueDir(basePath: string, dirName: string): Promise<string> {
    let uniquePath = dirName;
    let counter = 1;

    const baseName = dirName.replace(/-copy(-\d+)?$/, '');

    while (true) {
        try {
            await fs.access(path.join(basePath, uniquePath));
            uniquePath = `${baseName}-copy-${counter}`;
            counter++;
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                return uniquePath;
            }
            throw err;
        }
    }
}

export async function duplicateNextJsPage(
    projectRoot: string,
    sourcePath: string,
    targetPath: string,
): Promise<boolean> {
    const routerConfig = await detectRouterType(projectRoot);
    if (!routerConfig || routerConfig.type !== 'app') {
        throw new Error('Page duplication is only supported for App Router projects.');
    }

    // Handle root path case
    const isRootPath = ROOT_PATH_IDENTIFIERS.includes(sourcePath);

    if (isRootPath) {
        const sourcePageFile = path.join(routerConfig.basePath, 'page.tsx');
        const targetDir = await getUniqueDir(routerConfig.basePath, ROOT_PAGE_COPY_NAME);
        const targetPageFile = path.join(targetDir, 'page.tsx');

        // Check if target already exists
        if (
            await fs
                .access(targetDir)
                .then(() => true)
                .catch(() => false)
        ) {
            throw new Error('Target path already exists');
        }

        await fs.mkdir(targetDir, { recursive: true });
        await fs.copyFile(sourcePageFile, targetPageFile);
        return true;
    }

    // Handle non-root pages

    const normalizedSourcePath = sourcePath;
    const normalizedTargetPath = await getUniqueDir(routerConfig.basePath, targetPath);

    const sourceFull = path.join(routerConfig.basePath, normalizedSourcePath);
    const targetFull = path.join(routerConfig.basePath, normalizedTargetPath);

    // Check if target already exists
    if (
        await fs
            .access(targetFull)
            .then(() => true)
            .catch(() => false)
    ) {
        throw new Error('Target path already exists');
    }

    await fs.cp(sourceFull, targetFull, { recursive: true });
    return true;
}

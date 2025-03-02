import { promises as fs } from 'fs';
import * as path from 'path';
import { DEFAULT_PAGE_CONTENT, detectRouterType } from './helpers';

export async function createNextJsPage(projectRoot: string, pagePath: string): Promise<boolean> {
    try {
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            throw new Error('Could not detect Next.js router type');
        }

        if (routerConfig.type !== 'app') {
            throw new Error('Page creation is only supported for App Router projects.');
        }

        // Validate and normalize the path
        const normalizedPagePath = pagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        if (!/^[a-zA-Z0-9\-_[\]()/]+$/.test(normalizedPagePath)) {
            throw new Error('Page path contains invalid characters');
        }
        const fullPath = path.join(routerConfig.basePath, normalizedPagePath);
        const pageFilePath = path.join(fullPath, 'page.tsx');

        const pageExists = await fs
            .access(pageFilePath)
            .then(() => true)
            .catch(() => false);
        if (pageExists) {
            throw new Error('Page already exists at this path');
        }
        await fs.mkdir(fullPath, { recursive: true });
        await fs.writeFile(pageFilePath, DEFAULT_PAGE_CONTENT);

        return true;
    } catch (error) {
        console.error('Error creating page:', error);
        throw error;
    }
}

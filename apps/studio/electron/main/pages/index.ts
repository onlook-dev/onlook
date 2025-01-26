import { promises as fs } from 'fs';
import * as path from 'path';
import type { PageNode } from '@onlook/models/pages';

const VALID_PAGE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
const IGNORED_DIRECTORIES = ['api', 'components', 'lib', 'utils', 'node_modules'];
const POSSIBLE_PAGE_PATHS = ['src/app', 'app', 'pages', 'src/pages'];

async function scanDirectory(dir: string, parentPath: string = ''): Promise<PageNode[]> {
    const nodes: PageNode[] = [];

    const entries = await fs.readdir(dir, { withFileTypes: true });

    const pageFile = entries.find(
        (entry) =>
            entry.isFile() &&
            entry.name.startsWith('page.') &&
            VALID_PAGE_EXTENSIONS.includes(path.extname(entry.name)),
    );

    if (pageFile) {
        nodes.push({
            name: parentPath || 'home',
            path: parentPath ? `/${parentPath}` : '/',
            children: [],
            isActive: false,
        });
    }

    // Process directories
    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.includes(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(parentPath, entry.name);

        if (entry.isDirectory()) {
            const children = await scanDirectory(fullPath, relativePath);
            if (children.length > 0) {
                const dirPath = '/' + relativePath.replace(/\\/g, '/');
                nodes.push({
                    name: entry.name,
                    path: `${dirPath}/`,
                    children,
                    isActive: false,
                });
            }
        }
    }

    return nodes;
}

export async function scanNextJsPages(projectRoot: string): Promise<PageNode[]> {
    try {
        for (const pagePath of POSSIBLE_PAGE_PATHS) {
            const fullPath = path.join(projectRoot, pagePath);

            try {
                const stats = await fs.stat(fullPath);
                if (stats.isDirectory()) {
                    const pages = await scanDirectory(fullPath);
                    return pages;
                }
            } catch (error) {
                console.error(`Directory ${pagePath} not found or not accessible`);
                continue;
            }
        }

        return [];
    } catch (error) {
        console.error('Error scanning pages:', error);
        throw error;
    }
}

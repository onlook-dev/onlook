import { promises as fs } from 'fs';
import * as path from 'path';
import type { PageNode } from '@onlook/models/pages';
import log from 'electron-log';

const VALID_PAGE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];
const IGNORED_DIRECTORIES = ['api', 'components', 'lib', 'utils', 'node_modules'];
const POSSIBLE_PAGE_PATHS = ['src/app', 'app', 'pages', 'src/pages'];

async function scanDirectory(dir: string, parentPath: string = ''): Promise<PageNode[]> {
    const nodes: PageNode[] = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        log.info(
            `Scanning directory ${dir}, entries found:`,
            entries.map((e) => e.name),
        );

        const pageFile = entries.find(
            (entry) =>
                entry.isFile() &&
                entry.name.startsWith('page.') &&
                VALID_PAGE_EXTENSIONS.includes(path.extname(entry.name)),
        );

        if (pageFile) {
            nodes.push({
                name: parentPath || 'Home',
                // For root page, use unique path
                path: parentPath ? `/${parentPath}` : '/',
                children: [],
                isActive: false,
            });
            log.info(`Found page node: ${pageFile.name} at path: ${parentPath}`);
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
                        name: entry.name + '/',
                        path: `${dirPath}/`,
                        children,
                        isActive: false,
                    });
                    log.info(
                        `Added directory node: ${entry.name} with ${children.length} children`,
                    );
                }
            }
        }
    } catch (error) {
        log.info('Error scanning directory:', error);
        throw error;
    }

    return nodes;
}

export async function scanNextJsPages(projectRoot: string): Promise<PageNode[]> {
    try {
        log.info('scanNextJsPages called with:', projectRoot);

        for (const pagePath of POSSIBLE_PAGE_PATHS) {
            const fullPath = path.join(projectRoot, pagePath);
            log.info('Checking directory:', fullPath);

            try {
                const stats = await fs.stat(fullPath);
                if (stats.isDirectory()) {
                    log.info('Found valid pages directory:', fullPath);
                    const pages = await scanDirectory(fullPath);
                    log.info('Raw scanned pages:', JSON.stringify(pages, null, 2));
                    return pages;
                }
            } catch (error) {
                log.info(`Directory ${pagePath} not found or not accessible`);
                log.info('scanNextJsPages Error:', error);
                continue;
            }
        }

        log.info('No valid pages directory found');
        return [];
    } catch (error) {
        log.info('Error scanning pages:', error);
        throw error;
    }
}

import { promises as fs } from 'fs';
import * as path from 'path';
import type { PageNode } from '@onlook/models/pages';
import { ALLOWED_EXTENSIONS } from '../run/helpers';

const IGNORED_DIRECTORIES = ['api', 'components', 'lib', 'utils', 'node_modules'];
const APP_ROUTER_PATHS = ['src/app', 'app'];
const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];

interface RouterConfig {
    type: 'app' | 'pages';
    basePath: string;
}

async function detectRouterType(projectRoot: string): Promise<RouterConfig | null> {
    for (const appPath of APP_ROUTER_PATHS) {
        const fullPath = path.join(projectRoot, appPath);
        try {
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
                // Find App Router specific indicators
                const entries = await fs.readdir(fullPath, { withFileTypes: true });

                const hasLayoutFile = entries.some(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith('layout.') &&
                        ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
                );

                const hasRootPageFile = entries.some(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith('page.') &&
                        ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
                );

                // Find additional App Router specific files/patterns
                const hasTemplateFile = entries.some(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith('template.') &&
                        ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
                );

                const hasLoadingFile = entries.some(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith('loading.') &&
                        ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
                );

                const hasErrorFile = entries.some(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith('error.') &&
                        ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
                );

                if (
                    hasLayoutFile &&
                    (hasRootPageFile || hasTemplateFile || hasLoadingFile || hasErrorFile)
                ) {
                    return { type: 'app', basePath: fullPath };
                }
            }
        } catch (error) {
            console.error(`Error detecting router type for ${appPath}:`, error);
            continue;
        }
    }

    // check for Pages Router
    for (const pagesPath of PAGES_ROUTER_PATHS) {
        const fullPath = path.join(projectRoot, pagesPath);
        try {
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory()) {
                const entries = await fs.readdir(fullPath, { withFileTypes: true });
                const hasIndexFile = entries.some(
                    (entry) =>
                        entry.isFile() &&
                        entry.name.startsWith('index.') &&
                        ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
                );
                if (hasIndexFile) {
                    return { type: 'pages', basePath: fullPath };
                }
            }
        } catch (error) {
            console.error(`Error detecting router type for ${pagesPath}:`, error);
            continue;
        }
    }

    return null;
}

async function scanAppDirectory(dir: string, parentPath: string = ''): Promise<PageNode[]> {
    const nodes: PageNode[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Handle page files
    const pageFile = entries.find(
        (entry) =>
            entry.isFile() &&
            entry.name.startsWith('page.') &&
            ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
    );

    if (pageFile) {
        const currentDir = path.basename(dir);
        const isDynamicRoute = currentDir.startsWith('[') && currentDir.endsWith(']');

        let cleanPath;
        if (isDynamicRoute) {
            const paramName = currentDir;
            cleanPath = parentPath ? path.dirname(parentPath) + '/' + paramName : '/' + paramName;
        } else {
            cleanPath = parentPath ? `/${parentPath}` : '/';
        }

        // Normalize path and ensure leading slash & no trailing slash
        cleanPath = '/' + cleanPath.replace(/^\/|\/$/g, '');

        nodes.push({
            name: isDynamicRoute ? currentDir : parentPath ? path.basename(parentPath) : 'home',
            path: cleanPath,
            children: [],
            isActive: false,
        });
    }

    // Handle directories
    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.includes(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(parentPath, entry.name);

        if (entry.isDirectory()) {
            const children = await scanAppDirectory(fullPath, relativePath);
            if (children.length > 0) {
                const dirPath = relativePath.replace(/\\/g, '/');
                const cleanPath = '/' + dirPath.replace(/^\/|\/$/g, '');
                nodes.push({
                    name: entry.name,
                    path: cleanPath,
                    children,
                    isActive: false,
                });
            }
        }
    }

    return nodes;
}

async function scanPagesDirectory(dir: string, parentPath: string = ''): Promise<PageNode[]> {
    const nodes: PageNode[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    // Process files first
    for (const entry of entries) {
        if (
            entry.isFile() &&
            ALLOWED_EXTENSIONS.includes(path.extname(entry.name)) &&
            !IGNORED_DIRECTORIES.includes(entry.name.split('.')[0])
        ) {
            const fileName = entry.name.split('.')[0];
            const isDynamicRoute = fileName.startsWith('[') && fileName.endsWith(']');

            let cleanPath;
            if (fileName === 'index') {
                cleanPath = parentPath ? `/${parentPath}` : '/';
            } else {
                if (isDynamicRoute) {
                    const paramName = fileName.slice(1, -1);
                    cleanPath = path.join(parentPath, paramName);
                } else {
                    cleanPath = path.join(parentPath, fileName);
                }
                // Normalize path
                cleanPath = '/' + cleanPath.replace(/\\/g, '/').replace(/^\/|\/$/g, '');
            }

            nodes.push({
                name:
                    fileName === 'index'
                        ? parentPath
                            ? `/${path.basename(parentPath)}`
                            : 'home'
                        : '/' + fileName,
                path: cleanPath,
                children: [],
                isActive: false,
            });
        }
    }

    // Process directories
    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.includes(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        const isDynamicDir = entry.name.startsWith('[') && entry.name.endsWith(']');

        const dirNameForPath = isDynamicDir ? entry.name.slice(1, -1) : entry.name;
        const relativePath = path.join(parentPath, dirNameForPath);

        if (entry.isDirectory()) {
            const children = await scanPagesDirectory(fullPath, relativePath);
            if (children.length > 0) {
                const dirPath = relativePath.replace(/\\/g, '/');
                const cleanPath = '/' + dirPath.replace(/^\/|\/$/g, '');
                nodes.push({
                    name: entry.name,
                    path: cleanPath,
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
        const routerConfig = await detectRouterType(projectRoot);

        if (!routerConfig) {
            console.error('Could not detect Next.js router type');
            return [];
        }

        if (routerConfig.type === 'app') {
            return await scanAppDirectory(routerConfig.basePath);
        } else {
            return await scanPagesDirectory(routerConfig.basePath);
        }
    } catch (error) {
        console.error('Error scanning pages:', error);
        throw error;
    }
}

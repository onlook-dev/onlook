import type { PageNode } from '@onlook/models/pages';
import { promises as fs } from 'fs';
import { nanoid } from 'nanoid';
import * as path from 'path';
import { ALLOWED_EXTENSIONS } from '../run/helpers';
import {
    detectRouterType,
    IGNORED_DIRECTORIES,
    ROOT_PAGE_NAME,
    ROOT_PATH_IDENTIFIERS,
} from './helpers';

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

        const isRoot = ROOT_PATH_IDENTIFIERS.includes(cleanPath);
        nodes.push({
            id: nanoid(),
            name: isDynamicRoute
                ? currentDir
                : parentPath
                  ? path.basename(parentPath)
                  : ROOT_PAGE_NAME,
            path: cleanPath,
            children: [],
            isActive: false,
            isRoot,
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
                    id: nanoid(),
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

            const isRoot = ROOT_PATH_IDENTIFIERS.includes(cleanPath);

            nodes.push({
                id: nanoid(),
                name:
                    fileName === 'index'
                        ? parentPath
                            ? `/${path.basename(parentPath)}`
                            : ROOT_PAGE_NAME
                        : '/' + fileName,
                path: cleanPath,
                children: [],
                isActive: false,
                isRoot,
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
                    id: nanoid(),
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

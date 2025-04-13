import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { PageMetadata, PageNode } from '@onlook/models/pages';
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

export async function extractMetadata(filePath: string): Promise<PageMetadata | undefined> {
    try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Parse the file content using Babel
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let metadata: PageMetadata | undefined;

        // Traverse the AST to find metadata export
        traverse(ast, {
            ExportNamedDeclaration(path) {
                const declaration = path.node.declaration;
                if (t.isVariableDeclaration(declaration)) {
                    const declarator = declaration.declarations[0];
                    if (
                        t.isIdentifier(declarator.id) &&
                        declarator.id.name === 'metadata' &&
                        t.isObjectExpression(declarator.init)
                    ) {
                        metadata = {};
                        // Extract properties from the object expression
                        for (const prop of declarator.init.properties) {
                            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                                const key = prop.key.name;
                                if (t.isStringLiteral(prop.value)) {
                                    (metadata as any)[key] = prop.value.value;
                                } else if (t.isObjectExpression(prop.value)) {
                                    (metadata as any)[key] = extractObjectValue(prop.value);
                                } else if (t.isArrayExpression(prop.value)) {
                                    (metadata as any)[key] = extractArrayValue(prop.value);
                                }
                            }
                        }
                    }
                }
            },
        });

        return metadata;
    } catch (error) {
        console.error(`Error reading metadata from ${filePath}:`, error);
        return undefined;
    }
}

function extractObjectValue(obj: t.ObjectExpression): any {
    const result: any = {};
    for (const prop of obj.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            const key = prop.key.name;
            if (t.isStringLiteral(prop.value)) {
                result[key] = prop.value.value;
            } else if (t.isObjectExpression(prop.value)) {
                result[key] = extractObjectValue(prop.value);
            } else if (t.isArrayExpression(prop.value)) {
                result[key] = extractArrayValue(prop.value);
            }
        }
    }
    return result;
}

function extractArrayValue(arr: t.ArrayExpression): any[] {
    return arr.elements
        .map((element) => {
            if (t.isStringLiteral(element)) {
                return element.value;
            } else if (t.isObjectExpression(element)) {
                return extractObjectValue(element);
            } else if (t.isArrayExpression(element)) {
                return extractArrayValue(element);
            }
            return null;
        })
        .filter(Boolean);
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

        const isRoot = ROOT_PATH_IDENTIFIERS.includes(cleanPath);

        // Extract metadata from both page and layout files
        const pageMetadata = await extractMetadata(path.join(dir, pageFile.name));

        // Look for layout file in the same directory
        const layoutFile = entries.find(
            (entry) =>
                entry.isFile() &&
                entry.name.startsWith('layout.') &&
                ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
        );

        const layoutMetadata = layoutFile
            ? await extractMetadata(path.join(dir, layoutFile.name))
            : undefined;

        // Merge metadata, with page metadata taking precedence over layout metadata
        const metadata = {
            ...layoutMetadata,
            ...pageMetadata,
        };

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
            metadata,
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

            // Extract metadata from the page file
            const metadata = await extractMetadata(path.join(dir, entry.name));

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
                metadata,
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

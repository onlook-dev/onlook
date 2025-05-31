import type { PageNode, PageMetadata } from '@onlook/models';
import { nanoid } from 'nanoid';

export const normalizeRoute = (route: string): string => {
    return route
        .replace(/\\/g, '/') // Replace backslashes with forward slashes
        .replace(/\/+/g, '/') // Replace multiple slashes with single slash
        .replace(/^\/|\/$/g, '') // Remove leading and trailing slashes
        .toLowerCase(); // Ensure lowercase
};

export const validateNextJsRoute = (route: string): { valid: boolean; error?: string } => {
    if (!route) {
        return { valid: false, error: 'Page name is required' };
    }

    // Checks if it's a dynamic route
    const hasMatchingBrackets = /\[[^\]]*\]/.test(route);
    if (hasMatchingBrackets) {
        const dynamicRegex = /^\[([a-z0-9-]+)\]$/;
        if (!dynamicRegex.test(route)) {
            return {
                valid: false,
                error: 'Invalid dynamic route format. Example: [id] or [blog]',
            };
        }
        return { valid: true };
    }

    // For regular routes, allow lowercase letters, numbers, and hyphens
    const validCharRegex = /^[a-z0-9-]+$/;
    if (!validCharRegex.test(route)) {
        return {
            valid: false,
            error: 'Page name can only contain lowercase letters, numbers, and hyphens',
        };
    }

    return { valid: true };
};

export const doesRouteExist = (nodes: PageNode[], route: string): boolean => {
    const normalizedRoute = normalizeRoute(route);

    const checkNode = (nodes: PageNode[]): boolean => {
        for (const node of nodes) {
            if (normalizeRoute(node.path) === normalizedRoute) {
                return true;
            }
            if (
                Array.isArray(node.children) &&
                node.children.length > 0 &&
                checkNode(node.children)
            ) {
                return true;
            }
        }
        return false;
    };

    return checkNode(nodes);
};

// Constants from desktop implementation
const IGNORED_DIRECTORIES = ['api', 'components', 'lib', 'utils', 'node_modules'];
const APP_ROUTER_PATHS = ['src/app', 'app'];
const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];
const ALLOWED_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const ROOT_PAGE_NAME = 'Home';
const ROOT_PATH_IDENTIFIERS = ['', '/', '.'];

const DEFAULT_PAGE_CONTENT = `export default function Page() {
    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black transition-colors duration-200 flex-col p-4 gap-[32px]">
            <div className="text-center text-gray-900 dark:text-gray-100 p-4">
                <h1 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight">
                    This is a blank page
                </h1>
            </div>
        </div>
    );
}
`;

const getFileExtension = (fileName: string): string => {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.substring(lastDot) : '';
};

const getBaseName = (filePath: string): string => {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || '';
};

const getDirName = (filePath: string): string => {
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts.slice(0, -1).join('/');
};

const joinPath = (...parts: string[]): string => {
    return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
};

// Helper function to extract metadata from file content
const extractMetadata = async (content: string): Promise<PageMetadata | undefined> => {
    try {
        const { parse } = await import('@babel/parser');
        const traverse = (await import('@babel/traverse')).default;
        const t = await import('@babel/types');

        // Parse the file content using Babel
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let metadata: PageMetadata | undefined;

        // Helper functions for AST traversal
        const extractObjectValue = (obj: any): any => {
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
        };

        const extractArrayValue = (arr: any): any[] => {
            return arr.elements
                .map((element: any) => {
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
        };

        // Traverse the AST to find metadata export
        traverse(ast, {
            ExportNamedDeclaration(path) {
                const declaration = path.node.declaration;
                if (t.isVariableDeclaration(declaration)) {
                    const declarator = declaration.declarations[0];
                    if (
                        declarator &&
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
        console.error(`Error reading metadata:`, error);
        return undefined;
    }
};

// Adapted from desktop scan.ts - App Router scanning
const scanAppDirectory = async (
    session: any,
    dir: string,
    parentPath: string = ''
): Promise<PageNode[]> => {
    const nodes: PageNode[] = [];
    let entries;
    
    try {
        entries = await session.fs.readdir(dir);
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return nodes;
    }

    // Handle page files
    const pageFile = entries.find(
        (entry: any) =>
            entry.type === 'file' &&
            entry.name.startsWith('page.') &&
            ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)),
    );

    if (pageFile) {
        const currentDir = getBaseName(dir);
        const isDynamicRoute = currentDir.startsWith('[') && currentDir.endsWith(']');

        let cleanPath;
        if (isDynamicRoute) {
            const paramName = currentDir;
            cleanPath = parentPath ? joinPath(getDirName(parentPath), paramName) : '/' + paramName;
        } else {
            cleanPath = parentPath ? `/${parentPath}` : '/';
        }

        // Normalize path and ensure leading slash & no trailing slash
        cleanPath = '/' + cleanPath.replace(/^\/|\/$/g, '');

        const isRoot = ROOT_PATH_IDENTIFIERS.includes(cleanPath);

        // Extract metadata from both page and layout files
        let pageMetadata: PageMetadata | undefined;
        try {
            const pageContent = await session.fs.readTextFile(`${dir}/${pageFile.name}`);
            pageMetadata = await extractMetadata(pageContent);
        } catch (error) {
            console.error(`Error reading page file ${dir}/${pageFile.name}:`, error);
        }

        // Look for layout file in the same directory
        const layoutFile = entries.find(
            (entry: any) =>
                entry.type === 'file' &&
                entry.name.startsWith('layout.') &&
                ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)),
        );

        let layoutMetadata: PageMetadata | undefined;
        if (layoutFile) {
            try {
                const layoutContent = await session.fs.readTextFile(`${dir}/${layoutFile.name}`);
                layoutMetadata = await extractMetadata(layoutContent);
            } catch (error) {
                console.error(`Error reading layout file ${dir}/${layoutFile.name}:`, error);
            }
        }

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
                  ? getBaseName(parentPath)
                  : ROOT_PAGE_NAME,
            path: cleanPath,
            children: [],
            isActive: false,
            isRoot,
            metadata: metadata || {},
        });
    }

    // Handle directories
    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.includes(entry.name)) {
            continue;
        }

        const fullPath = `${dir}/${entry.name}`;
        const relativePath = joinPath(parentPath, entry.name);

        if (entry.type === 'directory') {
            const children = await scanAppDirectory(session, fullPath, relativePath);
            if (children.length > 0) {
                const dirPath = relativePath.replace(/\\/g, '/');
                const cleanPath = '/' + dirPath.replace(/^\/|\/$/g, '');
                nodes.push({
                    id: nanoid(),
                    name: entry.name,
                    path: cleanPath,
                    children,
                    isActive: false,
                    isRoot: false,
                    metadata: {},
                });
            }
        }
    }

    return nodes;
};

// Adapted from desktop scan.ts - Pages Router scanning
const scanPagesDirectory = async (
    session: any,
    dir: string,
    parentPath: string = ''
): Promise<PageNode[]> => {
    const nodes: PageNode[] = [];
    let entries;
    
    try {
        entries = await session.fs.readdir(dir);
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return nodes;
    }

    // Process files first
    for (const entry of entries) {
        if (
            entry.type === 'file' &&
            ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)) &&
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
                    cleanPath = joinPath(parentPath, paramName);
                } else {
                    cleanPath = joinPath(parentPath, fileName);
                }
                // Normalize path
                cleanPath = '/' + cleanPath.replace(/\\/g, '/').replace(/^\/|\/$/g, '');
            }

            const isRoot = ROOT_PATH_IDENTIFIERS.includes(cleanPath);

            // Extract metadata from the page file
            let metadata: PageMetadata | undefined;
            try {
                const fileContent = await session.fs.readTextFile(`${dir}/${entry.name}`);
                metadata = await extractMetadata(fileContent);
            } catch (error) {
                console.error(`Error reading file ${dir}/${entry.name}:`, error);
            }

            nodes.push({
                id: nanoid(),
                name:
                    fileName === 'index'
                        ? parentPath
                            ? `/${getBaseName(parentPath)}`
                            : ROOT_PAGE_NAME
                        : '/' + fileName,
                path: cleanPath,
                children: [],
                isActive: false,
                isRoot,
                metadata: metadata || {},
            });
        }
    }

    // Process directories
    for (const entry of entries) {
        if (IGNORED_DIRECTORIES.includes(entry.name)) {
            continue;
        }

        const fullPath = `${dir}/${entry.name}`;
        const isDynamicDir = entry.name.startsWith('[') && entry.name.endsWith(']');

        const dirNameForPath = isDynamicDir ? entry.name.slice(1, -1) : entry.name;
        const relativePath = joinPath(parentPath, dirNameForPath);

        if (entry.type === 'directory') {
            const children = await scanPagesDirectory(session, fullPath, relativePath);
            if (children.length > 0) {
                const dirPath = relativePath.replace(/\\/g, '/');
                const cleanPath = '/' + dirPath.replace(/^\/|\/$/g, '');
                nodes.push({
                    id: nanoid(),
                    name: entry.name,
                    path: cleanPath,
                    children,
                    isActive: false,
                    isRoot: false,
                    metadata: {},
                });
            }
        }
    }

    return nodes;
};

export const scanPagesFromSandbox = async (session: any): Promise<PageNode[]> => {
    if (!session) {
        throw new Error('No sandbox session available');
    }

    // Detect router configuration
    let routerConfig: { type: 'app' | 'pages'; basePath: string } | null = null;

    // Check for App Router first (Next.js 13+)
    for (const appPath of APP_ROUTER_PATHS) {
        try {
            const entries = await session.fs.readdir(appPath);
            if (entries && entries.length > 0) {
                console.log(`Found App Router at: ${appPath}`);
                routerConfig = { type: 'app', basePath: appPath };
                break;
            }
        } catch (error) {
            // Directory doesn't exist, continue checking
        }
    }

    // Check for Pages Router if App Router not found
    if (!routerConfig) {
        for (const pagesPath of PAGES_ROUTER_PATHS) {
            try {
                const entries = await session.fs.readdir(pagesPath);
                if (entries && entries.length > 0) {
                    console.log(`Found Pages Router at: ${pagesPath}`);
                    routerConfig = { type: 'pages', basePath: pagesPath };
                    break;
                }
            } catch (error) {
                // Directory doesn't exist, continue checking
            }
        }
    }

    if (!routerConfig) {
        console.log('No Next.js router detected, returning empty pages');
        return [];
    }

    if (routerConfig.type === 'app') {
        return await scanAppDirectory(session, routerConfig.basePath);
    } else {
        return await scanPagesDirectory(session, routerConfig.basePath);
    }
};

export const createPageInSandbox = async (session: any, pagePath: string): Promise<void> => {
    // Validate the path
    const normalizedPagePath = pagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    if (!/^[a-zA-Z0-9\-_[\]()/]+$/.test(normalizedPagePath)) {
        throw new Error('Page path contains invalid characters');
    }

    // TODO: Implement page creation using sandbox session
    console.log(`Creating page at path: ${normalizedPagePath}`);
    throw new Error('Page creation not yet implemented for sandbox');
};

export const deletePageInSandbox = async (session: any, pagePath: string, isDir: boolean): Promise<void> => {
    const normalizedPath = pagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    if (normalizedPath === '' || normalizedPath === '/') {
        throw new Error('Cannot delete root page');
    }

    // TODO: Implement page deletion using sandbox session
    console.log(`Deleting page at path: ${normalizedPath}`);
    throw new Error('Page deletion not yet implemented for sandbox');
};

export const renamePageInSandbox = async (session: any, oldPath: string, newName: string): Promise<void> => {
    // Validate new name
    if (!/^[a-zA-Z0-9\-_[\]()]+$/.test(newName)) {
        throw new Error('Page name contains invalid characters');
    }

    // TODO: Implement page renaming using sandbox session
    console.log(`Renaming page from ${oldPath} to ${newName}`);
    throw new Error('Page renaming not yet implemented for sandbox');
};

export const duplicatePageInSandbox = async (session: any, sourcePath: string, targetPath: string): Promise<void> => {
    // TODO: Implement page duplication using sandbox session
    console.log(`Duplicating page from ${sourcePath} to ${targetPath}`);
    throw new Error('Page duplication not yet implemented for sandbox');
};

export const updatePageMetadataInSandbox = async (session: any, pagePath: string, metadata: PageMetadata): Promise<void> => {
    // TODO: Implement metadata update using sandbox session
    console.log(`Updating metadata for page ${pagePath}`);
    throw new Error('Metadata update not yet implemented for sandbox');
};

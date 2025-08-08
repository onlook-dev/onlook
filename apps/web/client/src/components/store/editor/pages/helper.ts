import type { PageMetadata, PageNode, SandboxFile } from '@onlook/models';
import { RouterType } from '@onlook/models';
import { generate, getAstFromContent, types as t, traverse, type t as T } from '@onlook/parser';
import { nanoid } from 'nanoid';
import type { SandboxManager } from '../sandbox';
import { formatContent } from '../sandbox/helpers';
import type { ListFilesOutputFile } from '@onlook/code-provider';

const DEFAULT_LAYOUT_CONTENT = `export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}`;

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

const IGNORED_DIRECTORIES = ['api', 'components', 'lib', 'utils', 'node_modules'];
const APP_ROUTER_PATHS = ['src/app', 'app'];
const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];
const ALLOWED_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const ROOT_PAGE_NAME = 'Home';
const ROOT_PATH_IDENTIFIERS = ['', '/', '.'];
const ROOT_PAGE_COPY_NAME = 'landing-page-copy';

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
        const ast = getAstFromContent(content);
        if (!ast) {
            throw new Error('Failed to parse page file');
        }

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

export const scanAppDirectory = async (
    sandboxManager: SandboxManager,
    dir: string,
    parentPath = '',
): Promise<PageNode[]> => {
    const nodes: PageNode[] = [];
    let entries;

    try {
        entries = await sandboxManager.readDir(dir);
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return nodes;
    }

    const { pageFile, layoutFile } = getPageAndLayoutFiles(entries);

    const childDirectories = entries.filter(
        (entry) => entry.type === 'directory' && !IGNORED_DIRECTORIES.includes(entry.name),
    );

    if (pageFile) {
        const fileReadPromises: Array<Promise<SandboxFile | null>> = [];

        fileReadPromises.push(sandboxManager.readFile(`${dir}/${pageFile.name}`));

        if (layoutFile) {
            fileReadPromises.push(sandboxManager.readFile(`${dir}/${layoutFile.name}`));
        } else {
            fileReadPromises.push(Promise.resolve(null));
        }

        const childPromises = childDirectories.map((entry) => {
            const fullPath = `${dir}/${entry.name}`;
            const relativePath = joinPath(parentPath, entry.name);
            return scanAppDirectory(sandboxManager, fullPath, relativePath);
        });

        const [fileResults, childResults] = await Promise.all([
            Promise.all(fileReadPromises),
            Promise.all(childPromises),
        ]);

        const children = childResults.flat();

        const { pageMetadata, layoutMetadata } = await getPageAndLayoutMetadata(fileResults);

        const metadata = {
            ...layoutMetadata,
            ...pageMetadata,
        };

        // Create page node
        const currentDir = getBaseName(dir);
        const isDynamicRoute = currentDir.startsWith('[') && currentDir.endsWith(']');

        let cleanPath;
        if (isDynamicRoute) {
            const paramName = currentDir;
            cleanPath = parentPath ? joinPath(getDirName(parentPath), paramName) : '/' + paramName;
        } else {
            cleanPath = parentPath ? `/${parentPath}` : '/';
        }

        cleanPath = '/' + cleanPath.replace(/^\/|\/$/g, '');
        const isRoot = ROOT_PATH_IDENTIFIERS.includes(cleanPath);

        nodes.push({
            id: nanoid(),
            name: isDynamicRoute
                ? currentDir
                : parentPath
                  ? getBaseName(parentPath)
                  : ROOT_PAGE_NAME,
            path: cleanPath,
            children,
            isActive: false,
            isRoot,
            metadata: metadata ?? {},
        });
    } else {
        const childPromises = childDirectories.map(async (entry) => {
            const fullPath = `${dir}/${entry.name}`;
            const relativePath = joinPath(parentPath, entry.name);
            const children = await scanAppDirectory(sandboxManager, fullPath, relativePath);

            if (children.length > 0) {
                const currentDirName = getBaseName(dir);
                const containerPath = parentPath ? `/${parentPath}` : `/${currentDirName}`;
                const cleanPath = containerPath.replace(/\/+/g, '/');
                return {
                    id: nanoid(),
                    name: currentDirName,
                    path: cleanPath,
                    children,
                    isActive: false,
                    isRoot: false,
                    metadata: {},
                };
            }
            return null;
        });

        const childResults = await Promise.all(childPromises);
        const validNodes = childResults.filter((node) => node !== null);
        nodes.push(...validNodes);
    }

    return nodes;
};

const scanPagesDirectory = async (
    sandboxManager: SandboxManager,
    dir: string,
    parentPath = '',
): Promise<PageNode[]> => {
    const nodes: PageNode[] = [];
    let entries: ListFilesOutputFile[];

    try {
        entries = await sandboxManager.readDir(dir);
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return nodes;
    }

    // Process files first
    for (const entry of entries) {
        const fileName = entry.name?.split('.')[0];

        if (!fileName) {
            console.error(`Error reading file ${entry.name}`);
            continue;
        }

        if (
            entry.type === 'file' &&
            ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)) &&
            !IGNORED_DIRECTORIES.includes(fileName)
        ) {
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
                const file = await sandboxManager.readFile(`${dir}/${entry.name}`);
                if (!file || file.type !== 'text') {
                    throw new Error(`File ${dir}/${entry.name} not found or is not a text file`);
                }
                metadata = await extractMetadata(file.content);
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
            const children = await scanPagesDirectory(sandboxManager, fullPath, relativePath);
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

export const scanPagesFromSandbox = async (sandboxManager: SandboxManager): Promise<PageNode[]> => {
    // Use router config from sandbox manager
    const routerConfig = sandboxManager.routerConfig;

    if (!routerConfig) {
        console.log('No Next.js router detected, returning empty pages');
        return [];
    }

    if (routerConfig.type === RouterType.APP) {
        return await scanAppDirectory(sandboxManager, routerConfig.basePath);
    } else {
        return await scanPagesDirectory(sandboxManager, routerConfig.basePath);
    }
};

export const detectRouterTypeInSandbox = async (
    sandboxManager: SandboxManager,
): Promise<{ type: RouterType; basePath: string } | null> => {
    // Check for App Router
    for (const appPath of APP_ROUTER_PATHS) {
        try {
            const entries = await sandboxManager.readDir(appPath);
            if (entries && entries.length > 0) {
                // Check for layout file (required for App Router)
                const hasLayout = entries.some(
                    (entry) =>
                        entry.type === 'file' &&
                        entry.name.startsWith('layout.') &&
                        ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)),
                );

                if (hasLayout) {
                    return { type: RouterType.APP, basePath: appPath };
                }
            }
        } catch (error) {
            // Directory doesn't exist, continue checking
        }
    }

    // Check for Pages Router if App Router not found
    for (const pagesPath of PAGES_ROUTER_PATHS) {
        try {
            const entries = await sandboxManager.readDir(pagesPath);
            if (entries && entries.length > 0) {
                // Check for index file (common in Pages Router)
                const hasIndex = entries.some(
                    (entry) =>
                        entry.type === 'file' &&
                        entry.name.startsWith('index.') &&
                        ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)),
                );

                if (hasIndex) {
                    console.log(`Found Pages Router at: ${pagesPath}`);
                    return { type: RouterType.PAGES, basePath: pagesPath };
                }
            }
        } catch (error) {
            // Directory doesn't exist, continue checking
        }
    }

    return null;
};

// checks if file/directory exists
const pathExists = async (sandboxManager: SandboxManager, filePath: string): Promise<boolean> => {
    try {
        await sandboxManager.readDir(getDirName(filePath));
        const dirEntries = await sandboxManager.readDir(getDirName(filePath));
        const fileName = getBaseName(filePath);
        return dirEntries.some((entry: any) => entry.name === fileName);
    } catch (error) {
        return false;
    }
};

const cleanupEmptyFolders = async (
    sandboxManager: SandboxManager,
    folderPath: string,
): Promise<void> => {
    while (folderPath && folderPath !== getDirName(folderPath)) {
        try {
            const entries = await sandboxManager.readDir(folderPath);
            if (entries.length === 0) {
                // Delete empty directory using remove method
                await sandboxManager.delete(folderPath);
                folderPath = getDirName(folderPath);
            } else {
                break;
            }
        } catch (error) {
            // Directory doesn't exist or can't be accessed
            break;
        }
    }
};

const getUniqueDir = async (
    sandboxManager: SandboxManager,
    basePath: string,
    dirName: string,
    maxAttempts = 100,
): Promise<string> => {
    let uniquePath = dirName;
    let counter = 1;

    const baseName = dirName.replace(/-copy(-\d+)?$/, '');

    while (counter <= maxAttempts) {
        const fullPath = joinPath(basePath, uniquePath);
        if (!(await pathExists(sandboxManager, fullPath))) {
            return uniquePath;
        }
        uniquePath = `${baseName}-copy-${counter}`;
        counter++;
    }

    throw new Error(`Unable to find available directory name for ${dirName}`);
};

export const createPageInSandbox = async (
    sandboxManager: SandboxManager,
    pagePath: string,
): Promise<void> => {
    try {
        const routerConfig = sandboxManager.routerConfig;

        if (!routerConfig) {
            throw new Error('Could not detect Next.js router type');
        }

        if (routerConfig.type !== RouterType.APP) {
            throw new Error('Page creation is only supported for App Router projects.');
        }

        // Validate and normalize the path
        const normalizedPagePath = pagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        if (!/^[a-zA-Z0-9\-_[\]()/]+$/.test(normalizedPagePath)) {
            throw new Error('Page path contains invalid characters');
        }

        const fullPath = joinPath(routerConfig.basePath, normalizedPagePath);
        const pageFilePath = joinPath(fullPath, 'page.tsx');

        if (await pathExists(sandboxManager, pageFilePath)) {
            throw new Error('Page already exists at this path');
        }

        await sandboxManager.writeFile(pageFilePath, DEFAULT_PAGE_CONTENT);

        console.log(`Created page at: ${pageFilePath}`);
    } catch (error) {
        console.error('Error creating page:', error);
        throw error;
    }
};

export const deletePageInSandbox = async (
    sandboxManager: SandboxManager,
    pagePath: string,
    isDir: boolean,
): Promise<void> => {
    try {
        const routerConfig = sandboxManager.routerConfig;

        if (!routerConfig) {
            throw new Error('Could not detect Next.js router type');
        }

        if (routerConfig.type !== RouterType.APP) {
            throw new Error('Page deletion is only supported for App Router projects.');
        }

        const normalizedPath = pagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        if (normalizedPath === '' || normalizedPath === '/') {
            throw new Error('Cannot delete root page');
        }

        const fullPath = joinPath(routerConfig.basePath, normalizedPath);

        if (!(await pathExists(sandboxManager, fullPath))) {
            throw new Error('Selected page not found');
        }

        if (isDir) {
            // Delete entire directory
            await sandboxManager.delete(fullPath, true);
        } else {
            // Delete just the page.tsx file
            const pageFilePath = joinPath(fullPath, 'page.tsx');
            await sandboxManager.delete(pageFilePath);

            // Clean up empty parent directories
            await cleanupEmptyFolders(sandboxManager, fullPath);
        }

        console.log(`Deleted: ${fullPath}`);
    } catch (error) {
        console.error('Error deleting page:', error);
        throw error;
    }
};

export const renamePageInSandbox = async (
    sandboxManager: SandboxManager,
    oldPath: string,
    newName: string,
): Promise<void> => {
    try {
        const routerConfig = sandboxManager.routerConfig;

        if (!routerConfig || routerConfig.type !== RouterType.APP) {
            throw new Error('Page renaming is only supported for App Router projects.');
        }

        if (ROOT_PATH_IDENTIFIERS.includes(oldPath)) {
            throw new Error('Cannot rename root page');
        }

        // Validate new name
        if (!/^[a-zA-Z0-9\-_[\]()]+$/.test(newName)) {
            throw new Error('Page name contains invalid characters');
        }

        const normalizedOldPath = oldPath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        const oldFullPath = joinPath(routerConfig.basePath, normalizedOldPath);
        const parentDir = getDirName(oldFullPath);
        const newFullPath = joinPath(parentDir, newName);

        if (!(await pathExists(sandboxManager, oldFullPath))) {
            throw new Error(`Source page not found: ${oldFullPath}`);
        }

        if (await pathExists(sandboxManager, newFullPath)) {
            throw new Error(`Target path already exists: ${newFullPath}`);
        }

        await sandboxManager.rename(oldFullPath, newFullPath);

        console.log(`Renamed page from ${oldFullPath} to ${newFullPath}`);
    } catch (error) {
        console.error('Error renaming page:', error);
        throw error;
    }
};

export const duplicatePageInSandbox = async (
    sandboxManager: SandboxManager,
    sourcePath: string,
    targetPath: string,
): Promise<void> => {
    try {
        const routerConfig = sandboxManager.routerConfig;

        if (!routerConfig || routerConfig.type !== RouterType.APP) {
            throw new Error('Page duplication is only supported for App Router projects.');
        }

        // Handle root path case
        const isRootPath = ROOT_PATH_IDENTIFIERS.includes(sourcePath);

        if (isRootPath) {
            const sourcePageFile = joinPath(routerConfig.basePath, 'page.tsx');
            const targetDir = await getUniqueDir(
                sandboxManager,
                routerConfig.basePath,
                ROOT_PAGE_COPY_NAME,
            );
            const targetDirPath = joinPath(routerConfig.basePath, targetDir);
            const targetPageFile = joinPath(targetDirPath, 'page.tsx');

            if (await pathExists(sandboxManager, targetDirPath)) {
                throw new Error('Target path already exists');
            }

            await sandboxManager.copy(sourcePageFile, targetPageFile);

            console.log(`Duplicated root page to: ${targetPageFile}`);
            return;
        }

        // Handle non-root pages
        const normalizedSourcePath = sourcePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        const normalizedTargetPath = await getUniqueDir(
            sandboxManager,
            routerConfig.basePath,
            targetPath,
        );

        const sourceFull = joinPath(routerConfig.basePath, normalizedSourcePath);
        const targetFull = joinPath(routerConfig.basePath, normalizedTargetPath);

        if (await pathExists(sandboxManager, targetFull)) {
            throw new Error('Target path already exists');
        }

        // Check if source is a directory or file
        const sourceEntries = await sandboxManager.readDir(getDirName(sourceFull));
        const sourceEntry = sourceEntries.find(
            (entry: any) => entry.name === getBaseName(sourceFull),
        );

        if (!sourceEntry) {
            throw new Error('Source page not found');
        }

        await sandboxManager.copy(sourceFull, targetFull, true);

        console.log(`Duplicated page from ${sourceFull} to ${targetFull}`);
    } catch (error) {
        console.error('Error duplicating page:', error);
        throw error;
    }
};

export const updatePageMetadataInSandbox = async (
    sandboxManager: SandboxManager,
    pagePath: string,
    metadata: PageMetadata,
): Promise<void> => {
    const routerConfig = sandboxManager.routerConfig;

    if (!routerConfig) {
        throw new Error('Could not detect Next.js router type');
    }

    if (routerConfig.type !== RouterType.APP) {
        throw new Error('Metadata update is only supported for App Router projects for now.');
    }

    const fullPath = joinPath(routerConfig.basePath, pagePath);
    const pageFilePath = joinPath(fullPath, 'page.tsx');
    // check if page.tsx exists
    const pageExists = await pathExists(sandboxManager, pageFilePath);

    if (!pageExists) {
        throw new Error('Page not found');
    }

    const file = await sandboxManager.readFile(pageFilePath);
    if (!file || file.type !== 'text') {
        throw new Error('Page file not found or is not a text file');
    }
    const pageContent = file.content;
    const hasUseClient =
        pageContent.includes("'use client'") || pageContent.includes('"use client"');

    if (hasUseClient) {
        // check if layout.tsx exists
        const layoutFilePath = joinPath(fullPath, 'layout.tsx');
        const layoutExists = await pathExists(sandboxManager, layoutFilePath);

        if (layoutExists) {
            await updateMetadataInFile(sandboxManager, layoutFilePath, metadata);
        } else {
            // create layout.tsx
            // Create new layout file with metadata
            const layoutContent = `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = ${JSON.stringify(metadata, null, 2)};\n\n${DEFAULT_LAYOUT_CONTENT}`;
            await sandboxManager.writeFile(layoutFilePath, layoutContent);
        }
    } else {
        await updateMetadataInFile(sandboxManager, pageFilePath, metadata);
    }
};

async function updateMetadataInFile(
    sandboxManager: SandboxManager,
    filePath: string,
    metadata: PageMetadata,
) {
    // Read the current file content
    const file = await sandboxManager.readFile(filePath);
    if (!file || file.type !== 'text') {
        throw new Error('File not found or is not a text file');
    }
    const content = file.content;

    // Parse the file content using Babel
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error(`Failed to parse file ${filePath}`);
    }

    let hasMetadataImport = false;
    let metadataNode: T.ExportNamedDeclaration | null = null;

    // Traverse the AST to find metadata import and export
    traverse(ast, {
        ImportDeclaration(path) {
            if (
                path.node.source.value === 'next' &&
                path.node.specifiers.some(
                    (spec) =>
                        t.isImportSpecifier(spec) &&
                        t.isIdentifier(spec.imported) &&
                        spec.imported.name === 'Metadata',
                )
            ) {
                hasMetadataImport = true;
            }
        },
        ExportNamedDeclaration(path) {
            const declaration = path.node.declaration;
            if (t.isVariableDeclaration(declaration)) {
                const declarator = declaration.declarations[0];
                if (
                    declarator &&
                    t.isIdentifier(declarator.id) &&
                    declarator.id.name === 'metadata'
                ) {
                    metadataNode = path.node;
                }
            }
        },
    });

    // Add Metadata import if not present
    if (!hasMetadataImport) {
        const metadataImport = t.importDeclaration(
            [t.importSpecifier(t.identifier('Metadata'), t.identifier('Metadata'))],
            t.stringLiteral('next'),
        );
        ast.program.body.unshift(metadataImport);
    }
    // Create metadata object expression
    const metadataObject = t.objectExpression(
        Object.entries(metadata).map(([key, value]) => {
            if (typeof value === 'string') {
                if (key === 'metadataBase') {
                    return t.objectProperty(
                        t.identifier(key),
                        t.newExpression(t.identifier('URL'), [t.stringLiteral(value)]),
                    );
                }
                return t.objectProperty(t.identifier(key), t.stringLiteral(value));
            } else if (value === null) {
                return t.objectProperty(t.identifier(key), t.nullLiteral());
            } else if (Array.isArray(value)) {
                return t.objectProperty(
                    t.identifier(key),
                    t.arrayExpression(
                        value.map((v) => {
                            if (typeof v === 'string') {
                                return t.stringLiteral(v);
                            } else if (typeof v === 'object' && v !== null) {
                                return t.objectExpression(
                                    Object.entries(v).map(([k, val]) => {
                                        if (typeof val === 'string') {
                                            return t.objectProperty(
                                                t.identifier(k),
                                                t.stringLiteral(val),
                                            );
                                        } else if (typeof val === 'number') {
                                            return t.objectProperty(
                                                t.identifier(k),
                                                t.numericLiteral(val),
                                            );
                                        }
                                        return t.objectProperty(
                                            t.identifier(k),
                                            t.stringLiteral(String(val)),
                                        );
                                    }),
                                );
                            }
                            return t.stringLiteral(String(v));
                        }),
                    ),
                );
            } else if (typeof value === 'object' && value !== null) {
                return t.objectProperty(
                    t.identifier(key),
                    t.objectExpression(
                        Object.entries(value).map(([k, v]) => {
                            if (typeof v === 'string') {
                                return t.objectProperty(t.identifier(k), t.stringLiteral(v));
                            } else if (typeof v === 'number') {
                                return t.objectProperty(t.identifier(k), t.numericLiteral(v));
                            } else if (Array.isArray(v)) {
                                return t.objectProperty(
                                    t.identifier(k),
                                    t.arrayExpression(
                                        v.map((item) => {
                                            if (typeof item === 'string') {
                                                return t.stringLiteral(item);
                                            } else if (typeof item === 'object' && item !== null) {
                                                return t.objectExpression(
                                                    Object.entries(item).map(([ik, iv]) => {
                                                        if (typeof iv === 'string') {
                                                            return t.objectProperty(
                                                                t.identifier(ik),
                                                                t.stringLiteral(iv),
                                                            );
                                                        } else if (typeof iv === 'number') {
                                                            return t.objectProperty(
                                                                t.identifier(ik),
                                                                t.numericLiteral(iv),
                                                            );
                                                        }
                                                        return t.objectProperty(
                                                            t.identifier(ik),
                                                            t.stringLiteral(String(iv)),
                                                        );
                                                    }),
                                                );
                                            }
                                            return t.stringLiteral(String(item));
                                        }),
                                    ),
                                );
                            }
                            return t.objectProperty(t.identifier(k), t.stringLiteral(String(v)));
                        }),
                    ),
                );
            }
            return t.objectProperty(t.identifier(key), t.stringLiteral(String(value)));
        }),
    );

    // Create metadata variable declaration
    const metadataVarDecl = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('metadata'), metadataObject),
    ]);

    // Add type annotation
    const metadataTypeAnnotation = t.tsTypeAnnotation(t.tsTypeReference(t.identifier('Metadata')));
    (metadataVarDecl.declarations[0]?.id as T.Identifier).typeAnnotation = metadataTypeAnnotation;

    // Create metadata export
    const metadataExport = t.exportNamedDeclaration(metadataVarDecl);

    if (metadataNode) {
        // Replace existing metadata export
        const metadataExportIndex = ast.program.body.findIndex((node) => {
            if (!t.isExportNamedDeclaration(node) || !t.isVariableDeclaration(node.declaration)) {
                return false;
            }
            const declarator = node.declaration.declarations[0];
            return t.isIdentifier(declarator?.id) && declarator.id.name === 'metadata';
        });

        if (metadataExportIndex !== -1) {
            ast.program.body[metadataExportIndex] = metadataExport;
        }
    } else {
        // Find the default export and add metadata before it
        const defaultExportIndex = ast.program.body.findIndex((node) =>
            t.isExportDefaultDeclaration(node),
        );

        if (defaultExportIndex === -1) {
            throw new Error('Could not find default export in the file');
        }

        ast.program.body.splice(defaultExportIndex, 0, metadataExport);
    }

    // Generate the updated code
    const { code } = generate(ast);

    const formattedContent = await formatContent(filePath, code);

    // Write the updated content back to the file
    await sandboxManager.writeFile(filePath, formattedContent);
}

export const addSetupTask = async (sandboxManager: SandboxManager) => {
    const tasks = {
        setupTasks: ['bun install'],
        tasks: {
            dev: {
                name: 'Dev Server',
                command: 'bun run dev',
                preview: {
                    port: 3000,
                },
                runAtStart: true,
            },
        },
    };
    const content = JSON.stringify(tasks, null, 2);
    await sandboxManager.writeFile('./.codesandbox/tasks.json', content);
};

export const updatePackageJson = async (sandboxManager: SandboxManager) => {
    const file = await sandboxManager.readFile('./package.json');
    if (!file || file.type !== 'text') {
        throw new Error('Package.json not found or is not a text file');
    }
    const pkgJson = JSON.parse(file.content);

    pkgJson.scripts = pkgJson.scripts || {};
    pkgJson.scripts.dev = 'next dev';

    await sandboxManager.writeFile('./package.json', JSON.stringify(pkgJson, null, 2));
};

export const parseRepoUrl = (repoUrl: string): { owner: string; repo: string } => {
    const match = /github\.com\/([^/]+)\/([^/]+)(?:\.git)?/.exec(repoUrl);
    if (!match?.[1] || !match[2]) {
        throw new Error('Invalid GitHub URL');
    }

    return {
        owner: match[1],
        repo: match[2],
    };
};

const getPageAndLayoutFiles = (entries: ListFilesOutputFile[]) => {
    const pageFile = entries.find(
        (entry) =>
            entry.type === 'file' &&
            entry.name.startsWith('page.') &&
            ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)),
    );

    const layoutFile = entries.find(
        (entry) =>
            entry.type === 'file' &&
            entry.name.startsWith('layout.') &&
            ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name)),
    );

    return { pageFile, layoutFile };
};

const getPageAndLayoutMetadata = async (
    fileResults: (SandboxFile | null)[],
): Promise<{
    pageMetadata: PageMetadata | undefined;
    layoutMetadata: PageMetadata | undefined;
}> => {
    if (!fileResults || fileResults.length === 0) {
        return { pageMetadata: undefined, layoutMetadata: undefined };
    }

    const [pageFileResult, layoutFileResult] = fileResults;

    let pageMetadata: PageMetadata | undefined;
    let layoutMetadata: PageMetadata | undefined;

    if (pageFileResult && pageFileResult.type === 'text') {
        try {
            pageMetadata = await extractMetadata(pageFileResult.content);
        } catch (error) {
            console.error(`Error reading page file ${pageFileResult.path}:`, error);
        }
    }

    if (layoutFileResult && layoutFileResult.type === 'text') {
        try {
            layoutMetadata = await extractMetadata(layoutFileResult.content);
        } catch (error) {
            console.error(`Error reading layout file ${layoutFileResult.path}:`, error);
        }
    }

    return { pageMetadata, layoutMetadata };
};

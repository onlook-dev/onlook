import type { ReaddirEntry, WebSocketSession } from '@codesandbox/sdk';
import type { PageMetadata, PageNode } from '@onlook/models';
import { generate, parse, types as t, traverse } from '@onlook/parser';
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

const scanAppDirectory = async (
    session: WebSocketSession,
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

const scanPagesDirectory = async (
    session: WebSocketSession,
    dir: string,
    parentPath: string = ''
): Promise<PageNode[]> => {
    const nodes: PageNode[] = [];
    let entries: ReaddirEntry[];

    try {
        entries = await session.fs.readdir(dir);
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

export const scanPagesFromSandbox = async (session: WebSocketSession): Promise<PageNode[]> => {
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

const detectRouterTypeInSandbox = async (session: WebSocketSession): Promise<{ type: 'app' | 'pages'; basePath: string } | null> => {
    // Check for App Router
    for (const appPath of APP_ROUTER_PATHS) {
        try {
            const entries = await session.fs.readdir(appPath);
            if (entries && entries.length > 0) {
                // Check for layout file (required for App Router)
                const hasLayout = entries.some((entry: any) =>
                    entry.type === 'file' &&
                    entry.name.startsWith('layout.') &&
                    ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name))
                );

                if (hasLayout) {
                    console.log(`Found App Router at: ${appPath}`);
                    return { type: 'app', basePath: appPath };
                }
            }
        } catch (error) {
            // Directory doesn't exist, continue checking
        }
    }

    // Check for Pages Router if App Router not found
    for (const pagesPath of PAGES_ROUTER_PATHS) {
        try {
            const entries = await session.fs.readdir(pagesPath);
            if (entries && entries.length > 0) {
                // Check for index file (common in Pages Router)
                const hasIndex = entries.some((entry: any) =>
                    entry.type === 'file' &&
                    entry.name.startsWith('index.') &&
                    ALLOWED_EXTENSIONS.includes(getFileExtension(entry.name))
                );

                if (hasIndex) {
                    console.log(`Found Pages Router at: ${pagesPath}`);
                    return { type: 'pages', basePath: pagesPath };
                }
            }
        } catch (error) {
            // Directory doesn't exist, continue checking
        }
    }

    return null;
};

// checks if file/directory exists
const pathExists = async (session: WebSocketSession, filePath: string): Promise<boolean> => {
    try {
        await session.fs.readdir(getDirName(filePath));
        const dirEntries = await session.fs.readdir(getDirName(filePath));
        const fileName = getBaseName(filePath);
        return dirEntries.some((entry: any) => entry.name === fileName);
    } catch (error) {
        return false;
    }
};

const cleanupEmptyFolders = async (session: WebSocketSession, folderPath: string): Promise<void> => {
    while (folderPath && folderPath !== getDirName(folderPath)) {
        try {
            const entries = await session.fs.readdir(folderPath);
            if (entries.length === 0) {
                // Delete empty directory using remove method
                await session.fs.remove(folderPath);
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
    session: WebSocketSession,
    basePath: string,
    dirName: string,
    maxAttempts = 100,
): Promise<string> => {
    let uniquePath = dirName;
    let counter = 1;

    const baseName = dirName.replace(/-copy(-\d+)?$/, '');

    while (counter <= maxAttempts) {
        const fullPath = joinPath(basePath, uniquePath);
        if (!(await pathExists(session, fullPath))) {
            return uniquePath;
        }
        uniquePath = `${baseName}-copy-${counter}`;
        counter++;
    }

    throw new Error(`Unable to find available directory name for ${dirName}`);
};

const createDirectory = async (session: WebSocketSession, dirPath: string): Promise<void> => {
    // Creates a temporary file to ensure directory structure exists, then remove it
    const tempFile = joinPath(dirPath, '.temp');
    await session.fs.writeTextFile(tempFile, '');
    await session.fs.remove(tempFile);
};

export const createPageInSandbox = async (session: WebSocketSession, pagePath: string): Promise<void> => {
    try {
        const routerConfig = await detectRouterTypeInSandbox(session);

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

        const fullPath = joinPath(routerConfig.basePath, normalizedPagePath);
        const pageFilePath = joinPath(fullPath, 'page.tsx');

        if (await pathExists(session, pageFilePath)) {
            throw new Error('Page already exists at this path');
        }

        await session.fs.writeTextFile(pageFilePath, DEFAULT_PAGE_CONTENT);

        console.log(`Created page at: ${pageFilePath}`);
    } catch (error) {
        console.error('Error creating page:', error);
        throw error;
    }
};

export const deletePageInSandbox = async (session: WebSocketSession, pagePath: string, isDir: boolean): Promise<void> => {
    try {
        const routerConfig = await detectRouterTypeInSandbox(session);

        if (!routerConfig) {
            throw new Error('Could not detect Next.js router type');
        }

        if (routerConfig.type !== 'app') {
            throw new Error('Page deletion is only supported for App Router projects.');
        }

        const normalizedPath = pagePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        if (normalizedPath === '' || normalizedPath === '/') {
            throw new Error('Cannot delete root page');
        }

        const fullPath = joinPath(routerConfig.basePath, normalizedPath);

        if (!(await pathExists(session, fullPath))) {
            throw new Error('Selected page not found');
        }

        if (isDir) {
            // Delete entire directory
            await session.fs.remove(fullPath, true);
        } else {
            // Delete just the page.tsx file
            const pageFilePath = joinPath(fullPath, 'page.tsx');
            await session.fs.remove(pageFilePath);

            // Clean up empty parent directories
            await cleanupEmptyFolders(session, fullPath);
        }

        console.log(`Deleted: ${fullPath}`);
    } catch (error) {
        console.error('Error deleting page:', error);
        throw error;
    }
};

export const renamePageInSandbox = async (session: WebSocketSession, oldPath: string, newName: string): Promise<void> => {
    try {
        const routerConfig = await detectRouterTypeInSandbox(session);

        if (!routerConfig || routerConfig.type !== 'app') {
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

        if (!(await pathExists(session, oldFullPath))) {
            throw new Error(`Source page not found: ${oldFullPath}`);
        }

        if (await pathExists(session, newFullPath)) {
            throw new Error(`Target path already exists: ${newFullPath}`);
        }

        await session.fs.rename(oldFullPath, newFullPath);

        console.log(`Renamed page from ${oldFullPath} to ${newFullPath}`);
    } catch (error) {
        console.error('Error renaming page:', error);
        throw error;
    }
};

export const duplicatePageInSandbox = async (session: WebSocketSession, sourcePath: string, targetPath: string): Promise<void> => {
    try {
        const routerConfig = await detectRouterTypeInSandbox(session);

        if (!routerConfig || routerConfig.type !== 'app') {
            throw new Error('Page duplication is only supported for App Router projects.');
        }

        // Handle root path case
        const isRootPath = ROOT_PATH_IDENTIFIERS.includes(sourcePath);

        if (isRootPath) {
            const sourcePageFile = joinPath(routerConfig.basePath, 'page.tsx');
            const targetDir = await getUniqueDir(session, routerConfig.basePath, ROOT_PAGE_COPY_NAME);
            const targetDirPath = joinPath(routerConfig.basePath, targetDir);
            const targetPageFile = joinPath(targetDirPath, 'page.tsx');

            if (await pathExists(session, targetDirPath)) {
                throw new Error('Target path already exists');
            }

            await session.fs.copy(sourcePageFile, targetPageFile);

            console.log(`Duplicated root page to: ${targetPageFile}`);
            return;
        }

        // Handle non-root pages
        const normalizedSourcePath = sourcePath.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
        const normalizedTargetPath = await getUniqueDir(session, routerConfig.basePath, targetPath);

        const sourceFull = joinPath(routerConfig.basePath, normalizedSourcePath);
        const targetFull = joinPath(routerConfig.basePath, normalizedTargetPath);

        if (await pathExists(session, targetFull)) {
            throw new Error('Target path already exists');
        }

        // Check if source is a directory or file
        const sourceEntries = await session.fs.readdir(getDirName(sourceFull));
        const sourceEntry = sourceEntries.find((entry: any) => entry.name === getBaseName(sourceFull));

        if (!sourceEntry) {
            throw new Error('Source page not found');
        }

        await session.fs.copy(sourceFull, targetFull, true);

        console.log(`Duplicated page from ${sourceFull} to ${targetFull}`);
    } catch (error) {
        console.error('Error duplicating page:', error);
        throw error;
    }
};


export const updatePageMetadataInSandbox = async (session: WebSocketSession, pagePath: string, metadata: PageMetadata): Promise<void> => {
    // TODO: Implement metadata update using sandbox session
    console.log(`Updating metadata for page ${pagePath}`);
    throw new Error('Metadata update not yet implemented for sandbox');
};


export const injectPreloadScript = async (session: WebSocketSession) => {
    await addSetupTask(session);
    await updatePackageJson(session);

    // Step 3: Inject script tag
    const routerType = await detectRouterTypeInSandbox(session);
    const preLoadScript =
        'https://cdn.jsdelivr.net/gh/onlook-dev/web@latest/apps/web/preload/dist/index.js';

    if (!routerType || routerType.type !== 'app') {
        throw new Error('We are currently support only Next.js App projects.');
    }

    const layoutPath = './src/app/layout.tsx';
    const layoutRaw = await session.fs.readFile(layoutPath);
    const layoutSrc = new TextDecoder().decode(layoutRaw);

    const ast = parse(layoutSrc, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let importedScript = false;
    let foundHead = false;
    let alreadyInjected = false;

    traverse(ast, {
        ImportDeclaration(path) {
            if (path.node.source.value === 'next/script') {
                importedScript = true;
            }
        },
        JSXElement(path) {
            const opening = path.node.openingElement;

            if (
                t.isJSXIdentifier(opening.name, { name: 'Script' }) &&
                opening.attributes.some(
                    (attr) =>
                        t.isJSXAttribute(attr) &&
                        attr.name.name === 'src' &&
                        t.isStringLiteral(attr.value) &&
                        attr.value.value === preLoadScript,
                )
            ) {
                alreadyInjected = true;
            }

            if (t.isJSXIdentifier(opening.name, { name: 'head' })) {
                foundHead = true;

                if (!alreadyInjected) {
                    const scriptElement = t.jsxElement(
                        t.jsxOpeningElement(
                            t.jsxIdentifier('Script'),
                            [
                                t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                                t.jsxAttribute(
                                    t.jsxIdentifier('src'),
                                    t.stringLiteral(preLoadScript),
                                ),
                            ],
                            true,
                        ),
                        null,
                        [],
                        true,
                    );

                    // Prepend the script to the <head> children
                    path.node.children.unshift(scriptElement);
                    alreadyInjected = true;
                }
            }

            if (!foundHead && t.isJSXIdentifier(opening.name, { name: 'html' })) {
                if (!alreadyInjected) {
                    const scriptInHead = t.jsxElement(
                        t.jsxOpeningElement(
                            t.jsxIdentifier('Script'),
                            [
                                t.jsxAttribute(t.jsxIdentifier('type'), t.stringLiteral('module')),
                                t.jsxAttribute(
                                    t.jsxIdentifier('src'),
                                    t.stringLiteral(preLoadScript),
                                ),
                            ],
                            true,
                        ),
                        null,
                        [],
                        true,
                    );

                    const headElement = t.jsxElement(
                        t.jsxOpeningElement(t.jsxIdentifier('head'), [], false),
                        t.jsxClosingElement(t.jsxIdentifier('head')),
                        [scriptInHead],
                        false,
                    );

                    path.node.children.unshift(headElement);
                    foundHead = true;
                    alreadyInjected = true;
                }
            }
        },
    });

    if (!importedScript) {
        ast.program.body.unshift(
            t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier('Script'))],
                t.stringLiteral('next/script'),
            ),
        );
    }

    const { code } = generate(ast, {}, layoutSrc);

    await session.fs.writeFile(layoutPath, new TextEncoder().encode(code));
};

const addSetupTask = async (session: WebSocketSession) => {
    const tasks = {
        setupTasks: ['npm install'],
        tasks: {
            dev: {
                name: 'Dev Server',
                command: 'npm run dev',
                preview: {
                    port: 3000,
                },
                runAtStart: true,
            },
        },
    };
    await session.fs.writeFile(
        './.codesandbox/tasks.json',
        new TextEncoder().encode(JSON.stringify(tasks, null, 2)),
    );
};

const updatePackageJson = async (session: WebSocketSession) => {
    const pkgRaw = await session.fs.readFile('./package.json');
    const pkgJson = JSON.parse(new TextDecoder().decode(pkgRaw));

    pkgJson.scripts = pkgJson.scripts || {};
    pkgJson.scripts.dev = 'PORT=8084 next dev';

    await session.fs.writeFile(
        './package.json',
        new TextEncoder().encode(JSON.stringify(pkgJson, null, 2)),
    );
};

export const parseRepoUrl = (repoUrl: string): { owner: string; repo: string } => {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\.git)?/);
    if (!match || !match[1] || !match[2]) {
        throw new Error('Invalid GitHub URL');
    }

    return {
        owner: match[1],
        repo: match[2],
    };
};
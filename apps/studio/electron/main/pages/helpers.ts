import { promises as fs, type Dirent } from 'fs';
import * as path from 'path';
import { ALLOWED_EXTENSIONS } from '../run/helpers';

export const IGNORED_DIRECTORIES = ['api', 'components', 'lib', 'utils', 'node_modules'];
export const APP_ROUTER_PATHS = ['src/app', 'app'];
export const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];
export const DEFAULT_PAGE_CONTENT = `export default function Page() {
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
export const ROOT_PATH_IDENTIFIERS = ['', '/', '.'];
export const ROOT_PAGE_COPY_NAME = 'landing-page-copy';
export const ROOT_PAGE_NAME = 'Home';

interface RouterConfig {
    type: 'app' | 'pages';
    basePath: string;
}

interface FileCheck {
    prefix: string;
    required?: boolean;
}

export const APP_ROUTER_FILES: FileCheck[] = [
    { prefix: 'layout', required: true },
    { prefix: 'page' },
    { prefix: 'template' },
    { prefix: 'loading' },
    { prefix: 'error' },
];

async function hasFileWithPrefix(entries: Dirent[], fileCheck: FileCheck): Promise<boolean> {
    return entries.some(
        (entry) =>
            entry.isFile() &&
            entry.name.startsWith(`${fileCheck.prefix}.`) &&
            ALLOWED_EXTENSIONS.includes(path.extname(entry.name)),
    );
}

async function isAppRouter(entries: Dirent[]): Promise<boolean> {
    const fileChecks = await Promise.all(
        APP_ROUTER_FILES.map((check) => hasFileWithPrefix(entries, check)),
    );

    // Must have layout.tsx and at least one other app router file
    return fileChecks[0] && fileChecks.slice(1).some((hasFile) => hasFile);
}

async function isPagesRouter(entries: Dirent[]): Promise<boolean> {
    return hasFileWithPrefix(entries, { prefix: 'index' });
}

async function checkDirectory(
    fullPath: string,
    routerTypeCheck: (entries: Dirent[]) => Promise<boolean>,
): Promise<string | null> {
    try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            if (await routerTypeCheck(entries)) {
                return fullPath;
            }
        }
    } catch (error) {
        console.error(`Error checking directory ${fullPath}:`, error);
    }
    return null;
}

export async function detectRouterType(projectRoot: string): Promise<RouterConfig | null> {
    // Check for App Router
    for (const appPath of APP_ROUTER_PATHS) {
        const fullPath = path.join(projectRoot, appPath);
        const result = await checkDirectory(fullPath, isAppRouter);
        if (result) {
            return { type: 'app', basePath: result };
        }
    }

    // Check for Pages Router
    for (const pagesPath of PAGES_ROUTER_PATHS) {
        const fullPath = path.join(projectRoot, pagesPath);
        const result = await checkDirectory(fullPath, isPagesRouter);
        if (result) {
            return { type: 'pages', basePath: result };
        }
    }

    return null;
}

interface FileSystemError extends Error {
    code: string;
}

export async function cleanupEmptyFolders(folderPath: string) {
    while (folderPath !== path.dirname(folderPath)) {
        try {
            const files = await fs.readdir(folderPath);
            if (files.length === 0) {
                await fs.rm(folderPath, { recursive: true, force: true });
                folderPath = path.dirname(folderPath);
            } else {
                break;
            }
        } catch (err) {
            const fsError = err as FileSystemError;
            if (fsError.code === 'ENOENT') {
                console.warn(`Folder already deleted: ${folderPath}`);
                return;
            }
            if (fsError.code === 'EACCES') {
                console.error(`Permission denied: ${folderPath}`);
                return;
            }
            throw err;
        }
    }
}

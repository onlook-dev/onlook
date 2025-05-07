import fg from 'fast-glob';
import { access } from 'fs/promises';

export const IGNORE_PATHS = [
    'node_modules/**',
    'dist/**',
    'build/**',
    'public/**',
    'static/**',
    '.next/**',
    '.git/**',
    '.vscode/**',
    '.idea/**',
    '.DS_Store',
    '.env',
];

interface FileFilterOptions {
    patterns: string[];
    ignore: string[];
    maxDepth?: number;
}

export async function getAllFiles(
    dirPath: string,
    options: FileFilterOptions = {
        patterns: ['**/*'],
        ignore: IGNORE_PATHS,
        maxDepth: 5,
    },
): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
        const exists = await access(dirPath)
            .then(() => true)
            .catch(() => false);
        if (!exists) {
            return {
                success: false,
                error: `Directory does not exist: ${dirPath}`,
            };
        }
        const files = await fg(options.patterns, {
            cwd: dirPath,
            ignore: options.ignore,
            deep: options.maxDepth,
        });
        return { success: true, files };
    } catch (error) {
        console.error(error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
export async function getBrandConfigFiles(
    dirPath: string,
    options: FileFilterOptions = {
        patterns: ['**/globals.css', '**/tailwind.config.{js,ts,mjs}'],
        ignore: IGNORE_PATHS,
        maxDepth: 5,
    },
): Promise<{ success: boolean; files?: string[]; error?: string }> {
    return getAllFiles(dirPath, options);
}

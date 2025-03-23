import fg from 'fast-glob';

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

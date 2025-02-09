import { globSync } from 'glob';

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
}

export function getAllFiles(
    dirPath: string,
    options: FileFilterOptions = {
        patterns: ['**/*'],
        ignore: IGNORE_PATHS,
    },
): string[] {
    return globSync(options.patterns, {
        cwd: dirPath,
        ignore: options.ignore,
        nodir: true,
    });
}

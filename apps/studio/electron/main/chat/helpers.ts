import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const IGNORE_PATHS = [
    'node_modules',
    'dist',
    'build',
    'public',
    'static',
    '.next',
    '.git',
    '.vscode',
    '.idea',
    '.DS_Store',
    '.env',
];

const IGNORE_EXTENSIONS = [];

interface FileFilterOptions {
    extensions?: string[];
    exclude?: string[];
}

export function getAllFiles(
    dirPath: string,
    options: FileFilterOptions = {},
    fileList: string[] = [],
): string[] {
    const files = readdirSync(dirPath);

    for (const file of files) {
        const filePath = join(dirPath, file);
        const stat = statSync(filePath);

        // Skip excluded paths
        if (options.exclude?.some((pattern) => filePath.includes(pattern))) {
            continue;
        }

        if (stat.isDirectory()) {
            getAllFiles(filePath, options, fileList); // Recursive call for subdirectories
        } else {
            // Check file extension if extensions filter is provided
            if (options.extensions) {
                const ext = file.split('.').pop()?.toLowerCase();
                if (ext && options.extensions.includes(`.${ext}`)) {
                    fileList.push(filePath);
                }
            } else {
                fileList.push(filePath);
            }
        }
    }

    return fileList;
}

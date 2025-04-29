import path from 'path';

const SANDBOX_ROOT = '/project/sandbox';

export function normalizePath(p: string): string {
    let abs = path.isAbsolute(p) ? p : path.join(SANDBOX_ROOT, p);
    let relative = path.relative(SANDBOX_ROOT, abs);
    return relative.replace(/\\/g, '/'); // Always POSIX style
}

export function isSubdirectory(filePath: string, directories: string[]): boolean {
    // Normalize the file path by replacing backslashes with forward slashes
    const normalizedFilePath = path.resolve(filePath.replace(/\\/g, '/'));

    for (const directory of directories) {
        // Normalize the directory path by replacing backslashes with forward slashes
        const normalizedDir = path.resolve(directory.replace(/\\/g, '/'));
        const relative = path.relative(normalizedDir, normalizedFilePath);
        if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
            return true;
        }
    }
    return false;
}

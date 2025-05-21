import isSubdir from 'is-subdir';
import path from 'path';

// See: https://www.npmjs.com/package/is-subdir
// isSubdir(parentDir, subdir) returns true if subdir is the same as or inside parentDir
export function isSubdirectory(filePath: string, directories: string[]): boolean {
    const absFilePath = path.resolve(filePath);
    const normFilePath = absFilePath.replace(/\\/g, '/');
    for (const directory of directories) {
        const absDirectory = path.resolve(directory);
        const normDirectory = absDirectory.replace(/\\/g, '/');
        // Standard is-subdir check
        if (isSubdir(normDirectory, normFilePath)) {
            return true;
        }
        // If directory is a simple name (like 'foo' or '.git'), check if filePath contains it as a segment
        if (
            !directory.includes(path.sep) &&
            !directory.includes('/') &&
            !directory.includes('\\')
        ) {
            // Split file path into segments and check for directory name
            const segments = normFilePath.split('/');
            if (segments.includes(directory)) {
                return true;
            }
        }
    }
    return false;
}

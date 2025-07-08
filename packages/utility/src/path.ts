import isSubdir from 'is-subdir';
import path from 'path';

// Utility to normalize paths for comparison (handles Windows and POSIX)
function normalize(p: string): string {
    if (typeof p !== 'string' || !p) return '';
    let np = p.replace(/\\/g, '/');
    // Lowercase drive letter for Windows
    if (typeof np === 'string' && np.length > 0 && /^[A-Za-z]:\//.test(np)) {
        np = np[0]?.toLowerCase() + np.slice(1);
    }
    return np;
}

// See: https://www.npmjs.com/package/is-subdir
// isSubdir(parentDir, subdir) returns true if subdir is the same as or inside parentDir
export function isSubdirectory(filePath: string, directories: string[]): boolean {
    const absFilePath = path.resolve(filePath);
    const normFilePath = normalize(absFilePath);
    for (const directory of directories) {
        const absDirectory = path.resolve(directory);
        const normDirectory = normalize(absDirectory);
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
            const segments = normFilePath.split('/');
            if (segments.includes(directory)) {
                return true;
            }
        }
        // Enhanced: handle mixed absolute/relative by checking if directory segments appear in file path
        const dirSegments = normalize(directory).split('/').filter(Boolean);
        const fileSegments = normFilePath.split('/').filter(Boolean);
        if (dirSegments.length > 0 && fileSegments.length >= dirSegments.length) {
            for (let i = 0; i <= fileSegments.length - dirSegments.length; i++) {
                let match = true;
                for (let j = 0; j < dirSegments.length; j++) {
                    if (fileSegments[i + j] !== dirSegments[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Utility to check if a file matches the conditions
export const isTargetFile = (
    targetFile: string,
    conditions: { fileName: string; targetExtensions: string[]; potentialPaths: string[] },
): boolean => {
    const { fileName, targetExtensions, potentialPaths } = conditions;

    const fileExtWithDot = path.extname(targetFile);
    if (!fileExtWithDot) {
        return false;
    }

    const hasValidExtension = targetExtensions.some((ext) =>
        ext.startsWith('.') ? ext === fileExtWithDot : ext === fileExtWithDot.slice(1),
    );

    if (!hasValidExtension) {
        return false;
    }

    const baseName = path.basename(targetFile, fileExtWithDot);
    if (baseName !== fileName) {
        return false;
    }

    const dirName = normalize(path.dirname(targetFile));
    return potentialPaths.some((p) => normalize(p) === dirName);
};

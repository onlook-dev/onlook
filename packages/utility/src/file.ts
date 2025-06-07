/**
 * Check if a file is binary based on its extension
 * @param filename - The filename to check
 * @returns True if the file is binary, false otherwise
 */
export const isBinaryFile = (filename: string): boolean => {
    const binaryExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.svg',
        '.ico',
        '.webp',
        '.pdf',
        '.zip',
        '.tar',
        '.gz',
        '.rar',
        '.7z',
        '.mp3',
        '.mp4',
        '.wav',
        '.avi',
        '.mov',
        '.wmv',
        '.exe',
        '.bin',
        '.dll',
        '.so',
        '.dylib',
        '.woff',
        '.woff2',
        '.ttf',
        '.eot',
        '.otf',
    ];

    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return binaryExtensions.includes(ext);
};

/**
 * File operation interface for abstracted file operations
 */
export interface FileOperations {
    readFile: (filePath: string) => Promise<string | null>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    fileExists: (filePath: string) => Promise<boolean>;
    deleteFile: (filePath: string) => Promise<boolean>;
    copyDir: (source: string, destination: string) => Promise<boolean>;
    copyFile: (source: string, destination: string) => Promise<boolean>;
}

/**
 * Updates .gitignore file to include a target entry
 * @param target - The entry to add to .gitignore
 * @param fileOps - File operations interface
 * @returns True if successfully updated, false otherwise
 */
export const updateGitignore = async (
    target: string,
    fileOps: FileOperations,
): Promise<boolean> => {
    const gitignorePath = '.gitignore';

    try {
        // Check if .gitignore exists
        const gitignoreExists = await fileOps.fileExists(gitignorePath);

        if (!gitignoreExists) {
            // Create .gitignore with the target
            await fileOps.writeFile(gitignorePath, target + '\n');
            return true;
        }

        // Read existing .gitignore content
        const gitignoreContent = await fileOps.readFile(gitignorePath);
        if (gitignoreContent === null) {
            return false;
        }

        const lines = gitignoreContent.split(/\r?\n/);

        // Look for exact match of target
        if (!lines.some((line: string) => line.trim() === target)) {
            // Ensure there's a newline before adding if the file doesn't end with one
            const separator = gitignoreContent.endsWith('\n') ? '' : '\n';
            await fileOps.writeFile(gitignorePath, gitignoreContent + `${separator}${target}\n`);
        }

        return true;
    } catch (error) {
        console.error(`Failed to update .gitignore: ${error}`);
        return false;
    }
};

export const getDirName = (filePath: string): string => {
    const parts = filePath.split('/');
    if (parts.length <= 1) return '.';
    return parts.slice(0, -1).join('/') || '.';
};

export const getBaseName = (filePath: string): string => {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || '';
};

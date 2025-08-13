import { BINARY_EXTENSIONS, IMAGE_EXTENSIONS } from '@onlook/constants';
import mime from 'mime-lite';

/**
 * Check if a file is binary based on its extension
 * @param filename - The filename to check
 * @returns True if the file is binary, false otherwise
 */
export const isBinaryFile = (filename: string): boolean => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return BINARY_EXTENSIONS.includes(ext);
};

/**
 * File operation interface for abstracted file operations
 */
export interface FileOperations {
    readFile: (filePath: string) => Promise<string | null>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    fileExists: (filePath: string) => Promise<boolean>;
    delete: (filePath: string, recursive?: boolean) => Promise<boolean>;
    copy: (
        source: string,
        destination: string,
        recursive?: boolean,
        overwrite?: boolean,
    ) => Promise<boolean>;
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
    return parts.pop() || '';
};

export const getMimeType = (fileName: string): string => {
    const lowerCasedFileName = fileName.toLowerCase();

    if (lowerCasedFileName.endsWith('.ico')) return 'image/x-icon';
    if (lowerCasedFileName.endsWith('.png')) return 'image/png';
    if (lowerCasedFileName.endsWith('.jpg') || lowerCasedFileName.endsWith('.jpeg'))
        return 'image/jpeg';
    if (lowerCasedFileName.endsWith('.svg')) return 'image/svg+xml';
    if (lowerCasedFileName.endsWith('.gif')) return 'image/gif';
    if (lowerCasedFileName.endsWith('.webp')) return 'image/webp';
    if (lowerCasedFileName.endsWith('.bmp')) return 'image/bmp';
    const res = mime.getType(fileName);
    if (res) return res;
    return 'application/octet-stream';
};

export const isImageFile = (fileName: string): boolean => {
    const mimeType = getMimeType(fileName);
    return IMAGE_EXTENSIONS.includes(mimeType);
};

export const convertToBase64 = (content: Uint8Array): string => {
    return btoa(
        Array.from(content)
            .map((byte: number) => String.fromCharCode(byte))
            .join(''),
    );
};

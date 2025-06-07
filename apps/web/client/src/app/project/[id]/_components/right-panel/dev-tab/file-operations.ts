import path from 'path';

// System reserved names (Windows compatibility)
export const RESERVED_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL', 
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
] as const;

// Invalid characters for file/folder names across platforms
export const INVALID_CHARS_REGEX = /[<>:"|?*\\/]/;

export const FILE_CONSTRAINTS = {
    MAX_NAME_LENGTH: 255,
    MIN_NAME_LENGTH: 1,
    INVALID_CHARS: ['<', '>', ':', '"', '|', '?', '*', '\\', '/'],
    RESERVED_NAMES,
} as const;


export const validateFileName = (fileName: string): { valid: boolean; error?: string } => {
    if (!fileName) {
        return { valid: false, error: 'File name is required' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\\/]/;
    if (invalidChars.test(fileName)) {
        return { valid: false, error: 'File name contains invalid characters' };
    }

    // Check for reserved names
    if (FILE_CONSTRAINTS.RESERVED_NAMES.includes(fileName.toUpperCase() as any)) {
        return { valid: false, error: 'File name is reserved' };
    }

    // Check length
    if (fileName.length > 255) {
        return { valid: false, error: 'File name is too long' };
    }

    return { valid: true };
};

export const validateFolderName = (folderName: string): { valid: boolean; error?: string } => {
    if (!folderName) {
        return { valid: false, error: 'Folder name is required' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\\/]/;
    if (invalidChars.test(folderName)) {
        return { valid: false, error: 'Folder name contains invalid characters' };
    }

    // Check for reserved names
    if (RESERVED_NAMES.includes(folderName.toUpperCase() as any)) {
        return { valid: false, error: 'Folder name is reserved' };
    }

    // Check length
    if (folderName.length > 255) {
        return { valid: false, error: 'Folder name is too long' };
    }

    return { valid: true };
};

export const doesFileExist = (files: string[], filePath: string): boolean => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return files.some(file => file.replace(/\\/g, '/') === normalizedPath);
};

export const createFileInSandbox = async (session: any, filePath: string, content: string = ''): Promise<void> => {
    try {
        if (!session) {
            throw new Error('No sandbox session available');
        }

        await session.fs.writeTextFile(filePath, content);
        console.log(`Created file: ${filePath}`);
    } catch (error) {
        console.error('Error creating file:', error);
        throw error;
    }
};

export const createFolderInSandbox = async (session: any, folderPath: string): Promise<void> => {
    try {
        if (!session) {
            throw new Error('No sandbox session available');
        }

        // Create a temporary file to ensure directory structure exists, then remove it
        const tempFile = path.join(folderPath, '.temp').replace(/\\/g, '/');
        await session.fs.writeTextFile(tempFile, '');
        await session.fs.remove(tempFile);
        console.log(`Created folder: ${folderPath}`);
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
};

 
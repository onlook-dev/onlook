import type { SandboxManager } from '@/components/store/editor/sandbox';
import type { Provider } from '@onlook/code-provider';

// System reserved names (Windows compatibility)
export const RESERVED_NAMES = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
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
    if (INVALID_CHARS_REGEX.test(fileName)) {
        return { valid: false, error: 'File name contains invalid characters' };
    }

    // Check for reserved names
    if (
        FILE_CONSTRAINTS.RESERVED_NAMES.includes(
            fileName.toUpperCase() as (typeof FILE_CONSTRAINTS.RESERVED_NAMES)[number],
        )
    ) {
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
    if (INVALID_CHARS_REGEX.test(folderName)) {
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
    return files.some((file) => file.replace(/\\/g, '/') === normalizedPath);
};

export const doesFolderExist = (files: string[], folderPath: string): boolean => {
    const normalizedFolderPath = folderPath.replace(/\\/g, '/');

    const cleanFolderPath = normalizedFolderPath.replace(/\/$/, '');

    return files.some((file) => {
        const normalizedFile = file.replace(/\\/g, '/');

        return normalizedFile.startsWith(cleanFolderPath + '/');
    });
};

export const createFileInSandbox = async (
    provider: Provider | null,
    filePath: string,
    content: string = '',
    sandboxManager: SandboxManager,
): Promise<void> => {
    try {
        if (!provider) {
            throw new Error('No sandbox provider available');
        }
        await sandboxManager.writeFile(filePath, content);
    } catch (error) {
        console.error('Error creating file:', error);
        throw error;
    }
};

export const createFolderInSandbox = async (
    provider: Provider | null,
    folderPath: string,
    sandboxManager: SandboxManager,
): Promise<void> => {
    try {
        if (!provider) {
            throw new Error('No sandbox provider available');
        }

        // Creates folder by creating a .gitkeep file inside it
        // This automatically creates the directory structure and ensures
        // the empty directory is discoverable and tracked by Git
        const gitkeepPath = `${folderPath}/.gitkeep`.replace(/\\/g, '/');
        const gitkeepContent = '# This folder was created by Onlook\n';
        await sandboxManager.writeFile(gitkeepPath, gitkeepContent);
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
};

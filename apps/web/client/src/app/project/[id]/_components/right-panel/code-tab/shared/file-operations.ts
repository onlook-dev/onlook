
// System reserved names (Windows compatibility)
export const RESERVED_NAMES: string[] = [
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
]

// Invalid characters for file/folder names across platforms
export const INVALID_CHARS_REGEX = /[<>:"|?*\\/]/;

export const FILE_CONSTRAINTS = {
    MAX_NAME_LENGTH: 255,
    MIN_NAME_LENGTH: 1,
    INVALID_CHARS: ['<', '>', ':', '"', '|', '?', '*', '\\', '/'],
    RESERVED_NAMES,
}

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
            fileName.toUpperCase(),
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
    if (RESERVED_NAMES.includes(folderName.toUpperCase())) {
        return { valid: false, error: 'Folder name is reserved' };
    }

    // Check length
    if (folderName.length > 255) {
        return { valid: false, error: 'Folder name is too long' };
    }

    return { valid: true };
};

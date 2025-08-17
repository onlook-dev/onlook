import { DefaultSettings } from '@onlook/constants';
/**
 * Validates folder rename operation
 */
export const validateFolderRename = (
    folderPath: string,
    newName: string,
): { isValid: boolean; error?: string; newPath?: string } => {
    if (!newName?.trim()) {
        return { isValid: false, error: 'Folder name cannot be empty' };
    }

    const trimmedName = newName.trim();
    const parentPath = folderPath.includes('/')
        ? folderPath.substring(0, folderPath.lastIndexOf('/'))
        : '';
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;

    // Check if name is unchanged
    const currentName = folderPath.split('/').pop() ?? '';
    if (trimmedName === currentName) {
        return { isValid: false, error: 'Name unchanged' };
    }

    return { isValid: true, newPath };
};

/**
 * Validates folder move operation
 */
export const validateFolderMove = (
    sourcePath: string,
    targetPath: string,
): { isValid: boolean; error?: string; newPath?: string } => {
    if (!sourcePath || targetPath === undefined || targetPath === null) {
        return { isValid: false, error: 'Please select a target folder' };
    }

    // Prevent moving folder into itself or its children
    if (targetPath.startsWith(sourcePath + '/') || targetPath === sourcePath) {
        return { isValid: false, error: 'Cannot move folder into itself or its children' };
    }

    // Prevent moving folder into its parent (would create circular reference)
    if (sourcePath.startsWith(targetPath + '/')) {
        return { isValid: false, error: 'Cannot move folder into itself or its children' };
    }

    const sourceName = sourcePath.split('/').pop() ?? '';
    const newPath = targetPath ? `${targetPath}/${sourceName}` : sourceName;

    return { isValid: true, newPath };
};

/**
 * Validates folder creation operation
 */
export const validateFolderCreate = (
    folderName: string,
    parentPath?: string,
): { isValid: boolean; error?: string; newPath?: string } => {
    if (!folderName?.trim()) {
        return { isValid: false, error: 'Folder name cannot be empty' };
    }

    const trimmedName = folderName.trim();
    const newPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

    return { isValid: true, newPath };
};

/**
 * Generates the new path for a folder operation
 */
export const generateNewFolderPath = (
    currentPath: string,
    newName: string,
    operation: 'rename' | 'move' | 'create',
    targetPath?: string,
): string => {
    switch (operation) {
        case 'rename': {
            const parentPath = currentPath.includes('/')
                ? currentPath.substring(0, currentPath.lastIndexOf('/'))
                : '';
            return parentPath ? `${parentPath}/${newName}` : newName;
        }
        case 'move': {
            const sourceName = currentPath.split('/').pop() ?? '';
            return targetPath ? `${targetPath}/${sourceName}` : sourceName;
        }
        case 'create': {
            return targetPath ? `${targetPath}/${newName}` : newName;
        }
        default:
            return currentPath;
    }
};

export const ensureImageFolderPrefix = (path: string): string => {
    if (path.startsWith(DefaultSettings.IMAGE_FOLDER)) {
        return path;
    }
    return normalizePath(`${DefaultSettings.IMAGE_FOLDER}/${path}`);
};

/**
 * Checks if a path is a child of another path
 */
export const isChildPath = (childPath: string, parentPath: string): boolean => {
    return childPath.startsWith(parentPath + '/') || childPath === parentPath;
};

/**
 * Gets the parent path from a full path
 */
export const getParentPath = (fullPath: string): string => {
    return fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';
};

/**
 * Gets the folder name from a full path
 */
export const getFolderName = (fullPath: string): string => {
    return fullPath.split('/').pop() ?? '';
};

/**
 * Normalizes a path by removing empty segments and double slashes
 */
export const normalizePath = (path: string): string => {
    return path.split('/').filter(Boolean).join('/');
};

/**
 * Validates image move operation
 */
export const validateFileMove = (
    filePath: string,
    fileName: string,
    targetFolder: { fullPath: string },
): { isValid: boolean; error?: string; newPath?: string } => {
    if (!filePath || !fileName) {
        return { isValid: false, error: 'Invalid file path or file name' };
    }

    if (!targetFolder) {
        return { isValid: false, error: 'Please select a target folder' };
    }

    // Construct new path based on target folder
    const newPath = targetFolder.fullPath ? `${targetFolder.fullPath}/${fileName}` : fileName;

    // Don't move if it's already in the same location
    if (filePath === newPath) {
        return { isValid: false, error: 'File is already in the selected folder' };
    }

    return { isValid: true, newPath };
};

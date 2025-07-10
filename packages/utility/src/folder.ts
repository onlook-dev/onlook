import { DefaultSettings } from '@onlook/constants';
import type { FolderNode } from '@onlook/models';

/**
 * Creates a folder node with the given properties
 */
export const createFolderNode = (name: string, fullPath: string): FolderNode => ({
    name,
    fullPath,
    images: [],
    children: new Map(),
});

/**
 * Creates the base folder structure from image paths
 * This is the core logic extracted from the useFolder hook
 */
export const createBaseFolder = (imagePaths: string[]): FolderNode => {
    const root = createFolderNode(DefaultSettings.IMAGE_FOLDER, '');

    if (imagePaths.length === 0) {
        return root;
    }

    imagePaths.forEach((image) => {
        if (!image) return;

        const pathParts = image.split('/');
        pathParts.pop(); // Remove filename

        if (pathParts.length === 0) {
            root.images.push(image);
            return;
        }

        // Skip the first part if it matches the root folder name (e.g., "public")
        let startIndex = 0;
        if (pathParts[0] === DefaultSettings.IMAGE_FOLDER) {
            startIndex = 1;
        }

        // If after skipping root, there are no more parts, add to root
        if (startIndex >= pathParts.length) {
            root.images.push(image);
            return;
        }

        let currentNode = root;
        let currentPath = '';

        for (let i = startIndex; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!part) continue;

            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (!currentNode.children?.has(part)) {
                currentNode.children?.set(part, createFolderNode(part, currentPath));
            }

            currentNode = currentNode.children?.get(part) ?? createFolderNode(part, currentPath);
        }

        currentNode.images.push(image);
    });

    return root;
};

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

/**
 * Finds a folder in a folder structure by path
 */
export const findFolderInStructureByPath = (
    folder: FolderNode,
    targetPath: string,
): FolderNode | null => {
    if (folder.fullPath === targetPath) {
        return folder;
    }
    if (folder.children) {
        for (const child of folder.children.values()) {
            const found = findFolderInStructureByPath(child, targetPath);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Replaces an existing folder in the folder structure with a new folder
 */
export const replaceFolderInStructure = (
    rootFolder: FolderNode,
    targetPath: string,
    newFolder: FolderNode,
): FolderNode | null => {
    // If we're replacing the root folder itself
    if (rootFolder.fullPath === targetPath) {
        return newFolder;
    }

    // Find the parent path and folder name
    const parentPath = getParentPath(targetPath);
    const folderName = getFolderName(targetPath);

    // Find the parent folder
    const parentFolder = findFolderInStructureByPath(rootFolder, parentPath);
    if (!parentFolder || !parentFolder.children) {
        return null; // Parent not found or has no children
    }

    // Check if the target folder exists in the parent
    if (!parentFolder.children.has(folderName)) {
        return null; // Target folder doesn't exist
    }

    // Create a deep copy of the structure to maintain immutability
    const clonedRoot = cloneFolderStructure(rootFolder);
    const clonedParent = findFolderInStructureByPath(clonedRoot, parentPath);

    if (!clonedParent || !clonedParent.children) {
        return null;
    }

    // Replace the folder in the cloned structure
    clonedParent.children.set(folderName, newFolder);

    return clonedRoot;
};

/**
 * Creates a deep copy of a folder structure
 */
const cloneFolderStructure = (folder: FolderNode): FolderNode => {
    const clonedChildren = new Map<string, FolderNode>();

    if (folder.children) {
        for (const [key, child] of folder.children) {
            clonedChildren.set(key, cloneFolderStructure(child));
        }
    }

    return {
        name: folder.name,
        fullPath: folder.fullPath,
        images: [...folder.images], // Shallow copy of images array
        children: clonedChildren,
    };
};

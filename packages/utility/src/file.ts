import localforage from 'localforage';

type FileCache = Record<string, string>;

/**
 * Reads a file directly from localforage
 * @param filePath - The path of the file to read
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns The file content as string or null if not found
 */
export const readFileFromLocalforage = async (
    filePath: string,
    storageKey: string = 'file-sync-cache',
): Promise<string | null> => {
    try {
        const storedCache = await localforage.getItem<FileCache>(storageKey);
        if (!storedCache) {
            return null;
        }
        return storedCache[filePath] ?? null;
    } catch (error) {
        console.error(`Error reading file ${filePath} from localforage:`, error);
        return null;
    }
};

/**
 * Writes a file directly to localforage
 * @param filePath - The path of the file to write
 * @param content - The content to write
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns True if successfully written, false otherwise
 */
export const writeFileToLocalforage = async (
    filePath: string,
    content: string,
    storageKey: string = 'file-sync-cache',
): Promise<boolean> => {
    try {
        const storedCache = (await localforage.getItem<FileCache>(storageKey)) ?? {};
        const updatedCache = { ...storedCache, [filePath]: content };

        await localforage.setItem(storageKey, updatedCache);
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath} to localforage:`, error);
        return false;
    }
};

/**
 * Lists all file paths stored in localforage
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns Array of file paths
 */
export const listFilesFromLocalforage = async (
    storageKey: string = 'file-sync-cache',
): Promise<string[]> => {
    try {
        const storedCache = await localforage.getItem<FileCache>(storageKey);
        if (!storedCache) {
            return [];
        }
        return Object.keys(storedCache);
    } catch (error) {
        console.error('Error listing files from localforage:', error);
        return [];
    }
};

/**
 * Checks if a file exists in localforage
 * @param filePath - The path of the file to check
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns True if file exists, false otherwise
 */
export const fileExistsInLocalforage = async (
    filePath: string,
    storageKey: string = 'file-sync-cache',
): Promise<boolean> => {
    try {
        const storedCache = await localforage.getItem<FileCache>(storageKey);
        if (!storedCache) {
            return false;
        }
        return filePath in storedCache;
    } catch (error) {
        console.error(`Error checking file ${filePath} existence in localforage:`, error);
        return false;
    }
};

/**
 * Removes a specific file from localforage
 * @param filePath - The path of the file to remove
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns True if successfully removed, false otherwise
 */
export const removeFileFromLocalforage = async (
    filePath: string,
    storageKey: string = 'file-sync-cache',
): Promise<boolean> => {
    try {
        const storedCache = await localforage.getItem<FileCache>(storageKey);
        if (!storedCache || !(filePath in storedCache)) {
            return false;
        }

        const updatedCache = { ...storedCache };
        delete updatedCache[filePath];

        await localforage.setItem(storageKey, updatedCache);
        return true;
    } catch (error) {
        console.error(`Error removing file ${filePath} from localforage:`, error);
        return false;
    }
};

/**
 * Gets all files with their content from localforage
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns Object with file paths as keys and content as values
 */
export const getAllFilesFromLocalforage = async (
    storageKey: string = 'file-sync-cache',
): Promise<FileCache> => {
    try {
        const storedCache = await localforage.getItem<FileCache>(storageKey);
        return storedCache ?? {};
    } catch (error) {
        console.error('Error getting all files from localforage:', error);
        return {};
    }
};

/**
 * Clears all files from localforage
 * @param storageKey - The localforage key (defaults to 'file-sync-cache')
 * @returns True if successfully cleared, false otherwise
 */
export const clearAllFilesFromLocalforage = async (
    storageKey: string = 'file-sync-cache',
): Promise<boolean> => {
    try {
        await localforage.removeItem(storageKey);
        return true;
    } catch (error) {
        console.error('Error clearing all files from localforage:', error);
        return false;
    }
};

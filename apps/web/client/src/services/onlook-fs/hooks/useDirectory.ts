/** 
 * Hook to read a directory and its subdirectories.
 * 
 * Unfortunately it seems like zenfs doesn't support recursive directory reading, so this hook implements it for the user.
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnlookFS } from './useOnlookFS';
import type { Stats } from '@zenfs/core';

export interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    stats?: Stats;
    children?: FileEntry[];
}

export function useDirectory(
    projectId: string,
    branchId: string,
    path: string
) {
    const { fs, isInitializing, error: fsError } = useOnlookFS(projectId, branchId);
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const readDirectory = useCallback(async () => {
        // If FS is still initializing or has error, we can't read
        if (!fs) {
            if (fsError) {
                setError(fsError);
            }
            setLoading(isInitializing);
            return;
        }

        setLoading(true);
        setError(null);

        const readDirRecursive = async (dirPath: string): Promise<FileEntry[]> => {
            const fileNames = await fs.readdir(dirPath);
            const fileEntries: FileEntry[] = [];

            for (const name of fileNames) {
                const fullPath = dirPath === '/' ? `/${name}` : `${dirPath}/${name}`;
                
                const entry: FileEntry = {
                    name,
                    path: fullPath,
                    isDirectory: false,
                };

                try {
                    const stats = await fs.stat(fullPath);
                    entry.stats = stats;
                    entry.isDirectory = stats.isDirectory();

                    // Recursively read subdirectories
                    if (entry.isDirectory) {
                        entry.children = await readDirRecursive(fullPath);
                    }
                } catch (err) {
                    // Ignore stat errors for individual files
                    console.warn(`Failed to stat ${fullPath}:`, err);
                }

                fileEntries.push(entry);
            }

            // Sort: directories first, then alphabetically
            fileEntries.sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) {
                    return a.isDirectory ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            return fileEntries;
        };

        try {
            const entries = await readDirRecursive(path);
            setEntries(entries);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [fs, path, isInitializing, fsError]);

    useEffect(() => {
        void readDirectory();
    }, [readDirectory]);

    useEffect(() => {
        if (!fs) {
            return;
        }

        // Watch for changes anywhere in the file system
        // Since we're reading recursively, any change should trigger a full refresh
        const watcher = fs.watch('/', (eventType, filename) => {
            console.log('Directory watch event:', eventType, filename);
            // Re-read directory tree on any change
            void readDirectory();
        });

        return () => {
            watcher.close();
        };
    }, [fs, readDirectory]);

    const isLoading = loading || isInitializing;
    const combinedError = error ?? fsError;
    
    if (isLoading) {
        return { entries: [], loading: true, error: null };
    }
    
    if (combinedError) {
        return { entries: [], loading: false, error: combinedError };
    }
    
    return { entries, loading: false, error: null };
}

export type UseDirectoryResult = ReturnType<typeof useDirectory>;
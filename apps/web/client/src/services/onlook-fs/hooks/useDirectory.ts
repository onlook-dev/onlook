/** 
 * Hook to read a directory and its subdirectories.
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnlookFS } from './useOnlookFS';
import type { FileEntry } from '../types';

export { type FileEntry } from '../types';

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

        try {
            // OnlookFS now provides recursive directory reading
            const dirEntries = await fs.readDirectory(path);
            setEntries(dirEntries);
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

        // Watch the directory recursively for changes
        const cleanup = fs.watchDirectory(path, () => {
            // Re-read directory tree on any change
            void readDirectory();
        });

        return cleanup;
    }, [fs, path, readDirectory]);

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
import { useState, useEffect } from 'react';
import { useFS } from './useFS';
import type { FileEntry } from '../types';

export function useDirectory(rootDir: string, path: string) {
    const { fs, isInitializing, error: fsError } = useFS(rootDir);
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!fs) return;

        const loadDirectory = async () => {
            try {
                const dirEntries = await fs.readDirectory(path);
                setEntries(dirEntries);
                setError(null);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setEntries([]);
                setIsLoading(false);
            }
        };

        loadDirectory();

        return fs.watchDirectory(path, () => {
            loadDirectory();
        });
    }, [fs, path]);

    useEffect(() => {
        setIsLoading(true);
    }, [rootDir, path]);

    if (isInitializing || isLoading) {
        return { entries: [], loading: true, error: null };
    }

    if (error ?? fsError) {
        return { entries: [], loading: false, error: error ?? fsError };
    }

    return { entries, loading: false, error: null };
}

export type UseDirectoryResult = ReturnType<typeof useDirectory>;

'use client';

import { useEffect, useRef, useState } from 'react';

import { type FileEntry } from '../types';
import { useFS } from './use-fs';

export function useDirectory(projectId: string, branchId: string, path: string) {
    const { fs, isInitializing, error: fsError } = useFS(projectId, branchId);
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(false);

    useEffect(() => {
        if (!fs) {
            return;
        }

        const loadDirectory = async () => {
            // Prevent concurrent loads
            if (isLoadingRef.current) {
                return;
            }

            isLoadingRef.current = true;
            try {
                const dirEntries = await fs.readDirectory(path);
                setEntries(dirEntries);
                setError(null);
                setIsLoading(false);
            } catch (err) {
                console.error(`[useDirectory] Error loading ${path}:`, err);
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setEntries([]);
                setIsLoading(false);
            } finally {
                isLoadingRef.current = false;
            }
        };

        const debouncedLoadDirectory = () => {
            // Clear any pending reload
            if (reloadTimeoutRef.current) {
                clearTimeout(reloadTimeoutRef.current);
            }

            // Debounce reload to prevent infinite loops from rapid watch events
            reloadTimeoutRef.current = setTimeout(() => {
                loadDirectory();
            }, 100);
        };

        loadDirectory();

        const cleanup = fs.watchDirectory(path, debouncedLoadDirectory);

        return () => {
            // Clean up debounce timeout
            if (reloadTimeoutRef.current) {
                clearTimeout(reloadTimeoutRef.current);
            }
            isLoadingRef.current = false;
            cleanup();
        };
    }, [fs, path]);

    useEffect(() => {
        setIsLoading(true);
    }, [projectId, branchId, path]);

    // Type guards are used below to ensure that the resultant type is correct
    if (isInitializing || isLoading) {
        return { entries: [], loading: true, error: null };
    }

    if (error ?? fsError) {
        return { entries: [], loading: false, error: error ?? fsError };
    }

    return { entries, loading: false, error: null };
}

export type UseDirectoryResult = ReturnType<typeof useDirectory>;

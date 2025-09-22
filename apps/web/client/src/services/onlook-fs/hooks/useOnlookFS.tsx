'use client';

import { useState, useEffect } from 'react';
import { OnlookFS } from '../onlook-fs';

const fsCache = new Map<string, OnlookFS>();

export function useOnlookFS(projectId: string, branchId: string) {
    const [fs, setFs] = useState<OnlookFS | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const key = `${projectId}-${branchId}`;

        const cachedFS = fsCache.get(key);
        if (cachedFS) {
            setFs(cachedFS);
            setIsInitializing(false);
            return;
        }

        const initFS = async () => {
            try {
                setIsInitializing(true);
                setError(null);

                const onlookFS = new OnlookFS(projectId, branchId);
                await onlookFS.initialize();

                fsCache.set(key, onlookFS);
                setFs(onlookFS);
            } catch (err) {
                setError(
                    err instanceof Error ? err : new Error('Failed to initialize file system'),
                );
                setFs(null);
            } finally {
                setIsInitializing(false);
            }
        };

        void initFS();
    }, [projectId, branchId]);

    useEffect(() => {
        return () => {
            const key = `${projectId}-${branchId}`;
            const cachedFS = fsCache.get(key);
            if (cachedFS) {
                cachedFS.cleanup();
                fsCache.delete(key);
            }
        };
    }, [projectId, branchId]);

    if (isInitializing) {
        return { fs: null, isInitializing: true, error: null };
    }

    if (error) {
        return { fs: null, isInitializing: false, error };
    }

    return { fs: fs!, isInitializing: false, error: null };
}

export type UseOnlookFSResult = ReturnType<typeof useOnlookFS>;

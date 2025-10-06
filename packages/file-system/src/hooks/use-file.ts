'use client';

import { useEffect, useState } from 'react';

import { useFS } from './use-fs';

export function useFile(projectId: string, branchId: string, path: string) {
    const { fs, isInitializing, error: fsError } = useFS(projectId, branchId);
    const [content, setContent] = useState<string | Uint8Array<ArrayBufferLike> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!fs) return;

        const loadFile = async () => {
            try {
                const data = await fs.readFile(path);
                setContent(data);
                setError(null);
                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
                setContent(null);
                setIsLoading(false);
            }
        };

        void loadFile();

        return fs.watchFile(path, () => {
            void loadFile();
        });
    }, [fs, path]);

    useEffect(() => {
        setIsLoading(true);
    }, [projectId, branchId, path]);

    // Type guards are used below to ensure that the resultant type is correct
    if (isInitializing || isLoading) {
        return { content: null, loading: true, error: null };
    }

    if (error ?? fsError) {
        return { content: null, loading: false, error: error ?? fsError };
    }

    return { content, loading: false, error: null };
}

export type UseFileResult = ReturnType<typeof useFile>;

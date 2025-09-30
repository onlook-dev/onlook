'use client';

import { useEffect, useState } from 'react';

import { FileSystem } from '../fs';

export function useFS(rootDir: string) {
    const [fs, setFs] = useState<FileSystem | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fileSystem = new FileSystem(rootDir);

        fileSystem
            .initialize()
            .then(() => {
                setFs(fileSystem);
                setError(null);
                setIsInitializing(false);
            })
            .catch((err) => {
                setError(
                    err instanceof Error ? err : new Error('Failed to initialize file system'),
                );
                setFs(null);
                setIsInitializing(false);
            });

        return () => {
            fileSystem.cleanup();
        };
    }, [rootDir]);

    // Type guards are used below to ensure that the resultant type is correct
    if (isInitializing) {
        return { fs: null, isInitializing: true, error: null };
    }

    if (error) {
        return { fs: null, isInitializing: false, error };
    }

    return { fs: fs!, isInitializing: false, error: null };
}

export type UseFSResult = ReturnType<typeof useFS>;

import { useState, useEffect, useCallback } from 'react';
import { useOnlookFS } from './useOnlookFS';

export function useFile(
    projectId: string,
    branchId: string,
    path: string
) {
    const { fs, isInitializing, error: fsError } = useOnlookFS(projectId, branchId);
    const [content, setContent] = useState<string | Buffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const readFile = useCallback(async () => {
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
            // OnlookFS now handles auto-detection of text files
            const data = await fs.readFile(path);
            setContent(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setContent(null);
        } finally {
            setLoading(false);
        }
    }, [fs, path, isInitializing, fsError]);

    useEffect(() => {
        void readFile();
    }, [readFile]);

    useEffect(() => {
        if (!fs) {
            return;
        }

        // Always watch for changes to this file
        const cleanup = fs.watchFile(path, () => {
            void readFile();
        });

        return cleanup;
    }, [fs, path, readFile]);

    const isLoading = loading || isInitializing;
    const combinedError = error ?? fsError;
    
    if (isLoading) {
        return { content: null, loading: true, error: null };
    }
    
    if (combinedError) {
        return { content: null, loading: false, error: combinedError };
    }
    
    return { content: content!, loading: false, error: null };
}

export type UseFileResult = ReturnType<typeof useFile>;
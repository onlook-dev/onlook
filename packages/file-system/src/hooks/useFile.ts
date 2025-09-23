import { useState, useEffect } from 'react';
import { useFS } from './useFS';

export function useFile(rootDir: string, path: string) {
    const { fs, isInitializing, error: fsError } = useFS(rootDir);
    const [content, setContent] = useState<string | Buffer | null>(null);
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

        loadFile();

        return fs.watchFile(path, () => {
            loadFile();
        });
    }, [fs, path]);

    useEffect(() => {
        setIsLoading(false);
    }, [rootDir, path]);

    if (isInitializing || isLoading) {
        return { content: null, loading: true, error: null };
    }

    if (error ?? fsError) {
        return { content: null, loading: false, error: error ?? fsError };
    }

    return { content, loading: false, error: null };
}

export type UseFileResult = ReturnType<typeof useFile>;

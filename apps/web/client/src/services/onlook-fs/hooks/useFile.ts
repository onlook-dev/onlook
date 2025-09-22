import { useState, useEffect, useCallback } from 'react';
import { useOnlookFS } from './useOnlookFS';

// Common text file extensions
const TEXT_EXTENSIONS = new Set([
    '.txt', '.md', '.mdx', '.json', '.js', '.jsx', '.ts', '.tsx', 
    '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml', 
    '.svg', '.yml', '.yaml', '.toml', '.env', '.gitignore', 
    '.eslintrc', '.prettierrc', '.babelrc', '.editorconfig',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.py', '.rb', '.go',
    '.rs', '.c', '.cpp', '.h', '.hpp', '.java', '.kt', '.swift',
    '.m', '.mm', '.php', '.lua', '.vim', '.conf', '.ini', '.cfg'
]);

function isTextFile(path: string): boolean {
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    return TEXT_EXTENSIONS.has(ext);
}

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
            // Auto-detect if file should be read as text
            const data = isTextFile(path) 
                ? await fs.readFile(path, 'utf8')
                : await fs.readFile(path);
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
        const watcher = fs.watch(path, (eventType, filename) => {
            console.log('File watch event:', path, eventType, filename);
            void readFile();
        });

        return () => {
            watcher.close();
        };
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
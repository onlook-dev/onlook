import fg from 'fast-glob';

export const IGNORE_PATHS = [
    'node_modules/**',
    'dist/**',
    'build/**',
    'public/**',
    'static/**',
    '.next/**',
    '.git/**',
    '.vscode/**',
    '.idea/**',
    '.DS_Store',
    '.env',
];

interface FileFilterOptions {
    patterns: string[];
    ignore: string[];
    maxDepth?: number;
}

export async function getAllFiles(
    dirPath: string,
    options: FileFilterOptions = {
        patterns: ['**/*'],
        ignore: IGNORE_PATHS,
        maxDepth: 5,
    },
): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
        const files = await fg(options.patterns, {
            cwd: dirPath,
            ignore: options.ignore,
            deep: options.maxDepth,
        });
        return { success: true, files };
    } catch (error) {
        console.error(error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export function extractUrls(text: string): string[] {
    const httpPattern =
        /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

    const wwwPattern =
        /(?:^|\s)www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

    const markdownPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    const httpUrls: string[] = Array.from(text.matchAll(httpPattern), (match) => match[0]);
    const wwwUrls: string[] = Array.from(
        text.matchAll(wwwPattern),
        (match) => 'https://' + match[0].trim(),
    );
    const markdownUrls: string[] = Array.from(
        text.matchAll(markdownPattern),
        (match) => match[2] || '',
    );

    const allUrls: string[] = [...httpUrls, ...wwwUrls, ...markdownUrls];

    return Array.from(
        new Set(
            allUrls.filter((url) => {
                if (!url) return false;
                try {
                    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                    new URL(fullUrl);
                    return fullUrl;
                } catch {
                    return false;
                }
            }),
        ),
    );
}

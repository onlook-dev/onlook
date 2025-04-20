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
    // Regular URLs with http/https
    const httpPattern =
        /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

    // URLs starting with www
    const wwwPattern =
        /(?:^|\s)www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

    // Markdown links [text](url)
    const markdownPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

    // Extract all types of URLs
    const httpUrls = text.match(httpPattern) || [];
    const wwwUrls = (text.match(wwwPattern) || []).map((url) => 'https://' + url.trim());
    const markdownUrls = Array.from(text.matchAll(markdownPattern), (match) => match[2]);

    // Combine all URLs and remove duplicates
    const allUrls = [...httpUrls, ...wwwUrls, ...markdownUrls];

    // Validate URLs and return unique ones
    return Array.from(
        new Set(
            allUrls.filter((url) => {
                try {
                    // Add https:// prefix if missing
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

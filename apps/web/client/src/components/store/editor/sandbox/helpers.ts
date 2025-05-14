import path from 'path';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';

const SANDBOX_ROOT = '/project/sandbox';

export function normalizePath(p: string): string {
    let abs = path.isAbsolute(p) ? p : path.join(SANDBOX_ROOT, p);
    let relative = path.relative(SANDBOX_ROOT, abs);
    return relative.replace(/\\/g, '/'); // Always POSIX style
}

export function isSubdirectory(filePath: string, directories: string[]): boolean {
    // Normalize the file path by replacing backslashes with forward slashes
    const normalizedFilePath = path.resolve(filePath.replace(/\\/g, '/'));

    for (const directory of directories) {
        // Normalize the directory path by replacing backslashes with forward slashes
        const normalizedDir = path.resolve(directory.replace(/\\/g, '/'));
        const relative = path.relative(normalizedDir, normalizedFilePath);
        if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
            return true;
        }
    }
    return false;
}

export async function formatContent(filePath: string, content: string): Promise<string> {
    try {
        // Use browser standalone version with necessary plugins
        const formattedContent = await prettier.format(content, {
            filepath: filePath,
            plugins: [parserEstree, parserTypescript],
            parser: 'typescript',
        });
        return formattedContent;
    } catch (error: any) {
        console.error('Error formatting file:', error);
        return content;
    }
}

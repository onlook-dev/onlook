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
    // Always normalize to forward slashes and remove trailing slashes
    function normalize(p: string): string {
        let s = p.replace(/\\/g, '/');
        // Remove trailing slashes (but not for root)
        if (s.length > 1 && s.endsWith('/')) s = s.replace(/\/+$/, '');
        return s;
    }
    // Always resolve filePath relative to sandbox root if not absolute, but also if it starts with SANDBOX_ROOT, keep as is
    let absFilePath = path.isAbsolute(filePath) ? filePath : path.join(SANDBOX_ROOT, filePath);
    // If filePath is absolute but inside SANDBOX_ROOT, keep as is
    if (absFilePath.startsWith(SANDBOX_ROOT + '/')) {
        absFilePath = absFilePath;
    }
    const normalizedFilePath = normalize(path.resolve(absFilePath));

    for (let directory of directories) {
        // Always resolve directory relative to sandbox root if not absolute
        const absDir = path.isAbsolute(directory) ? directory : path.join(SANDBOX_ROOT, directory);
        const normalizedDir = normalize(path.resolve(absDir));
        // Ensure trailing slash for directory unless it's root
        const dirWithSlash = normalizedDir === '/' ? '/' : normalizedDir + '/';
        // Check if filePath is the directory or inside it
        if (
            normalizedFilePath === normalizedDir ||
            normalizedFilePath.startsWith(dirWithSlash)
        ) {
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

import path from 'path';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';
import isSubdir from 'is-subdir';

const SANDBOX_ROOT = '/project/sandbox';

export function normalizePath(p: string): string {
    let abs = path.isAbsolute(p) ? p : path.join(SANDBOX_ROOT, p);
    let relative = path.relative(SANDBOX_ROOT, abs);
    return relative.replace(/\\/g, '/'); // Always POSIX style
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

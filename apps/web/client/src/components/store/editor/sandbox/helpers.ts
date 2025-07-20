import { NEXT_JS_FILE_EXTENSIONS } from '@onlook/constants';
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

export async function formatContent(filePath: string, content: string): Promise<string> {
    try {
        const extension = path.extname(filePath);
        if (!NEXT_JS_FILE_EXTENSIONS.includes(extension)) {
            console.log('Skipping formatting for non-TS/TSX file:', filePath);
            return content;
        }

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

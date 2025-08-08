import type { WebSocketSession } from '@codesandbox/sdk';
import { NEXT_JS_FILE_EXTENSIONS } from '@onlook/constants';
import { type SandboxFile } from '@onlook/models';
import { getBaseName, getDirName, isImageFile, normalizePath } from '@onlook/utility';
import path from 'path';
import parserEstree from 'prettier/plugins/estree';
import parserTypescript from 'prettier/plugins/typescript';
import prettier from 'prettier/standalone';

export function getFileFromContent(filePath: string, content: string | Uint8Array) {
    const type = content instanceof Uint8Array ? 'binary' : 'text';
    const newFile: SandboxFile =
        type === 'binary'
            ? {
                  type,
                  path: filePath,
                  content: content as Uint8Array,
              }
            : {
                  type,
                  path: filePath,
                  content: content as string,
              };
    return newFile;
}

export async function readRemoteFile(
    client: WebSocketSession,
    filePath: string,
): Promise<SandboxFile | null> {
    try {
        if (isImageFile(filePath)) {
            console.log('reading image file', filePath);

            const content = await client.fs.readFile(filePath);
            return getFileFromContent(filePath, content);
        } else {
            const content = await client.fs.readTextFile(filePath);
            return getFileFromContent(filePath, content);
        }
    } catch (error) {
        console.error(`Error reading remote file ${filePath}:`, error);
        return null;
    }
}

export async function fileExists(client: WebSocketSession, path: string): Promise<boolean> {
    const normalizedPath = normalizePath(path);

    try {
        const dirPath = getDirName(normalizedPath);
        const fileName = getBaseName(normalizedPath);
        const dirEntries = await client.fs.readdir(dirPath);
        return dirEntries.some((entry) => entry.name === fileName);
    } catch (error) {
        console.error(`Error checking file existence ${normalizedPath}:`, error);
        return false;
    }
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

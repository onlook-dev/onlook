import { WebSocketSession } from '@codesandbox/sdk';
import { getBaseName, getDirName, normalizePath } from '@onlook/utility';
import { type SandboxFile } from '@onlook/models';
import { readRemoteFile, writeFile } from './utils';
import type { EditFileInput, EditFileOutput } from '../../../types';

export async function editFile(
    client: WebSocketSession,
    { args, applyDiff }: EditFileInput,
): Promise<EditFileOutput> {
    const exists = await fileExists(client, args.path);
    if (!exists) {
        throw new Error('File does not exist');
    }
    const originalFile = await readFile(client, args.path);

    if (!originalFile) {
        throw new Error('Error reading file');
    }

    if (originalFile.type === 'binary') {
        throw new Error('Binary files are not supported for editing');
    }

    const updatedContent = await applyDiff({
        originalCode: originalFile.content,
        updateSnippet: args.content,
        instruction: args.instruction,
    });
    if (!updatedContent.result) {
        throw new Error('Error applying code change: ' + updatedContent.error);
    }

    const result = await writeFile(client, args.path, updatedContent.result);
    if (!result) {
        throw new Error('Error editing file');
    }
    return 'File edited!';
}

async function fileExists(client: WebSocketSession, path: string): Promise<boolean> {
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

async function readFile(client: WebSocketSession, path: string): Promise<SandboxFile | null> {
    const normalizedPath = normalizePath(path);

    try {
        return readRemoteFile(client, normalizedPath);
    } catch (error) {
        console.error(`Error checking file existence ${normalizedPath}:`, error);
        return null;
    }
}

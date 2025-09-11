import type { WebSocketSession } from '@codesandbox/sdk';
import { type SandboxFile } from '@onlook/models';
import { isImageFile } from '@onlook/utility';

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

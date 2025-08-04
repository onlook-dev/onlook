import { WebSocketSession } from '@codesandbox/sdk';
import { convertToBase64 } from '@onlook/utility';
import { readRemoteFile } from './utils';
import type { ReadFilesInput, ReadFilesOutput, ReadFilesOutputFile } from '../../../types';

export async function readFiles(
    client: WebSocketSession,
    { args }: ReadFilesInput,
): Promise<ReadFilesOutput> {
    const files: ReadFilesOutputFile[] = [];
    for (const path of args.paths) {
        const file = await readRemoteFile(client, path);
        if (!file) {
            console.error(`Failed to read file ${path}`);
            continue;
        }
        if (file.type === 'text') {
            files.push({
                path: file.path,
                content: file.content,
                type: file.type,
                toString: () => {
                    return file.content;
                },
            });
        } else {
            // const base64Content = file.content ? convertToBase64(file.content) : '';
            files.push({
                path: file.path,
                content: file.content,
                type: file.type,
                toString: () => {
                    return file.content ? new TextDecoder().decode(file.content) : '';
                },
            });
        }
    }
    return { files };
}

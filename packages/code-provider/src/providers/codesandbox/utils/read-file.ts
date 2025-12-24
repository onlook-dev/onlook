import { WebSocketSession } from '@codesandbox/sdk';
import { convertToBase64 } from '@onlook/utility';
import type { ReadFileInput, ReadFileOutput } from '../../../types';
import { readRemoteFile } from './utils';

export async function readFile(
    client: WebSocketSession,
    { args }: ReadFileInput,
): Promise<ReadFileOutput> {
    const file = await readRemoteFile(client, args.path);
    if (!file) {
        throw new Error(`Failed to read file ${args.path}`);
    }
    if (file.type === 'text') {
        return {
            file: {
                path: file.path,
                content: file.content,
                type: file.type,
                toString: () => {
                    return file.content;
                },
            },
        };
    } else {
        return {
            file: {
                path: file.path,
                content: file.content,
                type: file.type,
                toString: () => {
                    // WARNING: This is not correct base64
                    return file.content ? convertToBase64(file.content) : '';
                },
            },
        };
    }
}

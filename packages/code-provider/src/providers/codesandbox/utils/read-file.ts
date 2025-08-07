import { WebSocketSession } from '@codesandbox/sdk';
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
        // const base64Content = file.content ? convertToBase64(file.content) : '';
        return {
            file: {
                path: file.path,
                content: file.content,
                type: file.type,
                toString: () => {
                    return file.content ? new TextDecoder().decode(file.content) : '';
                },
            },
        };
    }
}

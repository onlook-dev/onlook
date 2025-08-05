import { WebSocketSession } from '@codesandbox/sdk';
import { fileExists, writeFile } from './utils';
import type { CreateFileInput, CreateFileOutput } from '../../../types';

export async function createFile(
    client: WebSocketSession,
    { args }: CreateFileInput,
): Promise<CreateFileOutput> {
    if (!args.overwriteIfExists) {
        const exists = await fileExists(client, args.path);
        if (exists) {
            throw new Error('File already exists');
        }
    }
    const result = await writeFile(client, args.path, args.content);
    if (!result) {
        throw new Error('Error creating file');
    }
    return 'File created';
}

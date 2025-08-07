import { WebSocketSession } from '@codesandbox/sdk';
import type { WriteFileInput, WriteFileOutput } from '../../../types';
import { fileExists, writeFile as writeFileUtils } from './utils';

export async function writeFile(
    client: WebSocketSession,
    { args }: WriteFileInput,
): Promise<WriteFileOutput> {
    if (!args.overwrite) {
        const exists = await fileExists(client, args.path);
        if (exists) {
            throw new Error('File already exists');
        }
    }
    const result = await writeFileUtils(client, args.path, args.content, args.overwrite);
    if (!result) {
        throw new Error('Error creating file');
    }
    return 'File created';
}

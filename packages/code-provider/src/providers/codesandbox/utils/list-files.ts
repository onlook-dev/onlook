import { WebSocketSession } from '@codesandbox/sdk';
import type { ListFilesInput, ListFilesOutput } from '../../../types';

export async function listFiles(
    client: WebSocketSession,
    { args }: ListFilesInput,
): Promise<ListFilesOutput> {
    const files = await client.fs.readdir(args.path);

    return {
        files: files.map((file) => ({
            name: file.name,
            type: file.type,
            isSymlink: file.isSymlink,
        })),
    };
}

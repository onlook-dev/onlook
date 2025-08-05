import type { EditorEngine } from '@/components/store/editor/engine';
import {
    LIST_FILES_TOOL_PARAMETERS,
    READ_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleListFilesTool(
    args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{ path: string; type: 'file' | 'directory' }[]> {
    const result = await editorEngine.sandbox.readDir(args.path);
    if (!result) {
        throw new Error('Error listing files');
    }
    return result.map((file) => ({
        path: file.name,
        type: file.type,
    }));
}

export async function handleReadFileTool(args: z.infer<typeof READ_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    content: string;
    lines: number;
}> {
    try {
        const file = await editorEngine.sandbox.readFile(args.file_path);
        if (!file) {
            throw new Error(`Cannot read file ${args.file_path}: file not found`);
        }

        if (file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file is not text`);
        }

        const lines = file.content.split('\n');

        if (args.offset || args.limit) {
            const start = args.offset || 0;
            const end = args.limit ? start + args.limit : lines.length;
            const selectedLines = lines.slice(start, end);

            return {
                content: selectedLines.map((line, index) => `${start + index + 1}→${line}`).join('\n'),
                lines: selectedLines.length
            };
        }

        return {
            content: lines.map((line, index) => `${index + 1}→${line}`).join('\n'),
            lines: lines.length
        };
    } catch (error) {
        throw new Error(`Cannot read file ${args.file_path}: ${error}`);
    }
}

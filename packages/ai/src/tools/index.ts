import { anthropic } from '@ai-sdk/anthropic';
import { tool, type ToolSet } from 'ai';
import { readFile } from 'fs/promises';
import { ONLOOK_PROMPT } from 'src/prompt/onlook';
import { z } from 'zod';
import { getAllFiles } from './helpers';

export const listFilesTool = tool({
    description: 'List all files in the current directory, including subdirectories',
    parameters: z.object({
        path: z
            .string()
            .describe(
                'The absolute path to the directory to get files from. This should be the root directory of the project.',
            ),
    }),
    execute: async ({ path }) => {
        const res = await getAllFiles(path);
        if (!res.success) {
            return { error: res.error };
        }
        return res.files;
    },
});

export const readFilesTool = tool({
    description: 'Read the contents of files',
    parameters: z.object({
        paths: z.array(z.string()).describe('The absolute paths to the files to read'),
    }),
    execute: async ({ paths }) => {
        try {
            const files = await Promise.all(
                paths.map(async (path) => {
                    const file = await readFile(path, 'utf8');
                    return { path, content: file };
                }),
            );
            return files;
        } catch (error) {
            return `Error: ${error instanceof Error ? error.message : error}`;
        }
    },
});

export const onlookInstructionsTool = tool({
    description: 'Get the instructions for the Onlook AI',
    parameters: z.object({}),
    execute: async () => {
        return ONLOOK_PROMPT;
    },
});

// https://docs.anthropic.com/en/docs/agents-and-tools/computer-use#understand-anthropic-defined-tools
// https://sdk.vercel.ai/docs/guides/computer-use#get-started-with-computer-use

// We currently can't use this because it doens't support streaming
interface FileOperationHandlers {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<boolean>;
    undoEdit?: () => Promise<boolean>;
}

export const getStrReplaceEditorTool = (handlers: FileOperationHandlers) => {
    const strReplaceEditorTool = anthropic.tools.textEditor_20250124({
        execute: async ({
            command,
            path,
            file_text,
            insert_line,
            new_str,
            old_str,
            view_range,
        }) => {
            try {
                switch (command) {
                    case 'view': {
                        const content = await handlers.readFile(path);
                        if (view_range) {
                            const lines = content.split('\n');
                            const [start, end] = view_range;
                            return lines.slice(start - 1, end).join('\n');
                        }
                        return content;
                    }
                    case 'create': {
                        if (!file_text) {
                            throw new Error('file_text is required for create command');
                        }
                        await handlers.writeFile(path, file_text);
                        return `File created successfully at ${path}`;
                    }
                    case 'str_replace': {
                        if (!old_str) {
                            throw new Error('old_str is required for str_replace command');
                        }
                        const content = await handlers.readFile(path);
                        const newContent = content.replace(old_str, new_str || '');
                        await handlers.writeFile(path, newContent);
                        return `String replaced successfully in ${path}`;
                    }
                    case 'insert': {
                        if (!new_str || insert_line === undefined) {
                            throw new Error(
                                'new_str and insert_line are required for insert command',
                            );
                        }
                        const content = await handlers.readFile(path);
                        const lines = content.split('\n');
                        lines.splice(insert_line, 0, new_str);
                        await handlers.writeFile(path, lines.join('\n'));
                        return `Content inserted successfully at line ${insert_line} in ${path}`;
                    }
                    case 'undo_edit': {
                        if (handlers.undoEdit) {
                            await handlers.undoEdit();
                            return 'Edit undone successfully';
                        }
                        return 'Undo operation not implemented';
                    }
                    default: {
                        throw new Error(`Unknown command: ${command}`);
                    }
                }
            } catch (error) {
                return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        },
    });
    return strReplaceEditorTool;
};

export const chatToolSet: ToolSet = {
    list_files: listFilesTool,
    read_files: readFilesTool,
    onlook_instructions: onlookInstructionsTool,
};

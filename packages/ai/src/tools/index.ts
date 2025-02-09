import { tool } from 'ai';
import { readFileSync } from 'fs';
import { z } from 'zod';
import { getAllFiles } from './helpers';

export const listFilesTool = tool({
    description: 'List all files in the current directory, including subdirectories',
    parameters: z.object({
        path: z.string().describe('The absolute path to the directory to get files from'),
    }),
    execute: async ({ path }) => {
        const files = getAllFiles(path);
        return files;
    },
});

export const readFileTool = tool({
    description: 'Read the contents of a file',
    parameters: z.object({
        path: z.string().describe('The absolute path to the file to read'),
    }),
    execute: async ({ path }) => {
        const file = readFileSync(path, 'utf8');
        return file;
    },
});

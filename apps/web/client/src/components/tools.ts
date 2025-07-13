import type { EditorEngine } from '@/components/store/editor/engine';
import { api } from '@/trpc/client';
import type {
    CREATE_FILE_TOOL_PARAMETERS,
    EDIT_FILE_TOOL_PARAMETERS,
    LIST_FILES_TOOL_PARAMETERS,
    READ_FILES_TOOL_PARAMETERS,
    SCRAPE_URL_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_PARAMETERS,
    SAVE_IMAGE_TOOL_PARAMETERS
} from '@onlook/ai';
import {
    CREATE_FILE_TOOL_NAME,
    EDIT_FILE_TOOL_NAME,
    LIST_FILES_TOOL_NAME,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_STYLE_GUIDE_TOOL_NAME,
    SCRAPE_URL_TOOL_NAME,
    TERMINAL_COMMAND_TOOL_NAME,
    SAVE_IMAGE_TOOL_NAME,
} from '@onlook/ai';
import type { ImageMessageContext, SandboxFile } from '@onlook/models';
import { MessageContextType } from '@onlook/models';
import { convertToBase64 } from '@onlook/utility';
import type { ToolCall } from 'ai';
import { z } from 'zod';

type ToolHandler = (args: any, editorEngine: EditorEngine) => Promise<any>;


const toolHandlers: Record<string, ToolHandler> = {
    [LIST_FILES_TOOL_NAME]: handleListFiles,
    [READ_FILES_TOOL_NAME]: handleReadFiles,
    [READ_STYLE_GUIDE_TOOL_NAME]: handleReadStyleGuide,
    [ONLOOK_INSTRUCTIONS_TOOL_NAME]: async () => ONLOOK_INSTRUCTIONS,
    [EDIT_FILE_TOOL_NAME]: handleEditFile,
    [CREATE_FILE_TOOL_NAME]: handleCreateFile,
    [TERMINAL_COMMAND_TOOL_NAME]: handleTerminalCommand,
    [SCRAPE_URL_TOOL_NAME]: handleScrapeUrl,
    [SAVE_IMAGE_TOOL_NAME]: handleCreateImage
};


export async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine) {
    const { toolName, args } = toolCall;
    const handler = toolHandlers[toolName];

    if (!handler) {
        return `Unknown tool call: ${toolName}`;
    }

    try {
        console.log(`Executing tool: ${toolName}`, args);
        return await handler(args, editorEngine);
    } catch (error) {
        console.error(`Error handling tool call "${toolName}":`, error);
        // Return a user-friendly error message.
        return error instanceof Error ? error.message : 'An unknown error occurred.';
    }
}

async function handleListFiles(
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

async function handleReadFiles(
    args: z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{ path: string; content: string; type: 'text' | 'binary' }[]> {
    const records: Record<string, SandboxFile> = await editorEngine.sandbox.readFiles(args.paths);
    if (!records) {
        throw new Error('Error reading files');
    }

    const files = Object.values(records).map((file) => {
        if (file.type === 'text') {
            return {
                path: file.path,
                content: file.content,
                type: file.type,
            };
        } else {
            const base64Content = file.content ? convertToBase64(file.content) : '';
            return {
                path: file.path,
                content: base64Content,
                type: file.type,
            };
        }
    });

    return files;
}

async function handleReadStyleGuide(editorEngine: EditorEngine): Promise<{
    configPath: string;
    cssPath: string;
    configContent: string;
    cssContent: string;
}> {
    const result = await editorEngine.theme.initializeTailwindColorContent();
    if (!result) {
        throw new Error('Style guide files not found');
    }
    return result;
}

async function handleEditFile(
    args: z.infer<typeof EDIT_FILE_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<string> {
    const exists = await editorEngine.sandbox.fileExists(args.path);
    if (!exists) {
        throw new Error('File does not exist');
    }
    const originalFile = await editorEngine.sandbox.readFile(args.path);

    if (!originalFile) {
        throw new Error('Error reading file');
    }

    if (originalFile.type === 'binary') {
        throw new Error('Binary files are not supported for editing');
    }

    const updatedContent = await api.code.applyDiff.mutate({
        originalCode: originalFile.content,
        updateSnippet: args.content,
        instruction: args.instruction,
    });
    if (!updatedContent.result) {
        throw new Error('Error applying code change: ' + updatedContent.error);
    }

    const result = await editorEngine.sandbox.writeFile(args.path, updatedContent.result);
    if (!result) {
        throw new Error('Error editing file');
    }
    return 'File edited!';
}

async function handleCreateFile(
    args: z.infer<typeof CREATE_FILE_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<string> {
    const exists = await editorEngine.sandbox.fileExists(args.path);
    if (exists) {
        throw new Error('File already exists');
    }
    const result = await editorEngine.sandbox.writeFile(args.path, args.content);
    if (!result) {
        throw new Error('Error creating file');
    }
    return 'File created';
}

async function handleTerminalCommand(
    args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    return await editorEngine.sandbox.session.runCommand(args.command);
}

async function handleScrapeUrl(
    args: z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>,
): Promise<string> {
    try {
        const result = await api.code.scrapeUrl.mutate({
            url: args.url,
            formats: args.formats,
            onlyMainContent: args.onlyMainContent,
            includeTags: args.includeTags,
            excludeTags: args.excludeTags,
            waitFor: args.waitFor,
        });

        if (!result.result) {
            throw new Error(`Failed to scrape URL: ${result.error}`);
        }

        return result.result;
    } catch (error) {
        console.error('Error scraping URL:', error);
        throw new Error(`Failed to scrape URL ${args.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function handleCreateImage(
    args: z.infer<typeof SAVE_IMAGE_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<string> {
    const { path, fileId } = args;

    const imageContext = editorEngine.chat.context.context.find(
        (c): c is ImageMessageContext =>
            c.type === MessageContextType.IMAGE && c.fileId === fileId,
    );

    if (!imageContext) {
        const errorMessage = `Error: Could not find an image in the context with fileId "${fileId}".`;
        console.error(errorMessage);
        return errorMessage;
    }

    const decodeBase64Image = (base64String: string): Uint8Array => {
        const commaIndex = base64String.indexOf(',');
        if (commaIndex === -1) {
            throw new Error('Invalid base64 string: missing data URI scheme.');
        }

        const base64Data = base64String.substring(commaIndex + 1);

        const binaryString = atob(base64Data);

        const len = binaryString.length;
        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes;
    }


    try {
        const imageData = decodeBase64Image(imageContext.content);

        await editorEngine.sandbox.writeBinaryFile(path, imageData);
        
        editorEngine.chat.context.context = editorEngine.chat.context.context.filter(
            (c) => {
                if (c.type !== MessageContextType.IMAGE) {
                    return true;
                }
                return c.fileId !== fileId;
            }
        );

        const successMessage = `Successfully saved image to ${path}.`;
        console.log(successMessage);
        return successMessage;

    } catch (error) {
        const errorMessage = `Error: Failed to save image to path "${path}". Reason: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage, error);
        return errorMessage;
    }
}
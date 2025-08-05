import type { EditorEngine } from '@/components/store/editor/engine';
import { api } from '@/trpc/client';
import type {
    CREATE_FILE_TOOL_PARAMETERS,
    EDIT_FILE_TOOL_PARAMETERS,
    LIST_FILES_TOOL_PARAMETERS,
    READ_FILES_TOOL_PARAMETERS,
    SCRAPE_URL_TOOL_PARAMETERS,
    TERMINAL_COMMAND_TOOL_PARAMETERS
} from '@onlook/ai';
import type { SandboxFile } from '@onlook/models';
import { convertToBase64 } from '@onlook/utility';
import { z } from 'zod';

async function handleListFilesTool(
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

async function handleReadFilesTool(
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

async function handleReadStyleGuideTool(editorEngine: EditorEngine): Promise<{
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

async function handleEditFileTool(
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

    const metadata = {
        projectId: editorEngine.projectId,
        conversationId: editorEngine.chat.conversation.current?.id,
    };

    const updatedContent = await api.code.applyDiff.mutate({
        originalCode: originalFile.content,
        updateSnippet: args.content,
        instruction: args.instruction,
        metadata,
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

async function handleCreateFileTool(
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

async function handleTerminalCommandTool(
    args: z.infer<typeof TERMINAL_COMMAND_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    return await editorEngine.sandbox.session.runCommand(args.command);
}

async function handleScrapeUrlTool(
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

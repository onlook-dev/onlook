import type { EditorEngine } from '@/components/store/editor/engine';
import { api } from '@/trpc/client';
import {
    FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleSearchReplaceEditFileTool(args: z.infer<typeof SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
        }
        const file = await sandbox.readFile(args.file_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
        }

        let newContent: string;
        if (args.replace_all) {
            newContent = file.content.replaceAll(args.old_string, args.new_string);
        } else {
            // More efficient: count occurrences in single pass
            const firstIndex = file.content.indexOf(args.old_string);
            if (firstIndex === -1) {
                throw new Error(`String not found in file: ${args.old_string}`);
            }

            const secondIndex = file.content.indexOf(args.old_string, firstIndex + args.old_string.length);
            if (secondIndex !== -1) {
                throw new Error(`Multiple occurrences found. Use replace_all=true or provide more context.`);
            }

            newContent = file.content.replace(args.old_string, args.new_string);
        }

        const result = await sandbox.writeFile(args.file_path, newContent);
        if (!result) {
            throw new Error(`Failed to write file ${args.file_path}`);
        }

        return `File ${args.file_path} edited successfully`;
    } catch (error) {
        throw new Error(`Cannot edit file ${args.file_path}: ${error}`);
    }
}

export async function handleSearchReplaceMultiEditFileTool(args: z.infer<typeof SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
        }
        const file = await sandbox.readFile(args.file_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
        }

        let content = file.content;

        for (const edit of args.edits) {
            if (edit.replace_all) {
                content = content.replaceAll(edit.old_string, edit.new_string);
            } else {
                // More efficient: count occurrences in single pass
                const firstIndex = content.indexOf(edit.old_string);
                if (firstIndex === -1) {
                    throw new Error(`String not found in file: ${edit.old_string}`);
                }

                const secondIndex = content.indexOf(edit.old_string, firstIndex + edit.old_string.length);
                if (secondIndex !== -1) {
                    throw new Error(`Multiple occurrences found for "${edit.old_string}". Use replace_all=true or provide more context.`);
                }

                content = content.replace(edit.old_string, edit.new_string);
            }
        }

        const result = await sandbox.writeFile(args.file_path, content);
        if (!result) {
            throw new Error(`Failed to write file ${args.file_path}`);
        }

        return `File ${args.file_path} edited with ${args.edits.length} changes`;
    } catch (error) {
        throw new Error(`Cannot multi-edit file ${args.file_path}: ${error}`);
    }
}

export async function handleWriteFileTool(args: z.infer<typeof WRITE_FILE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
        }
        const result = await sandbox.writeFile(args.file_path, args.content);
        if (!result) {
            throw new Error(`Failed to write file ${args.file_path}`);
        }
        return `File ${args.file_path} written successfully`;
    } catch (error) {
        throw new Error(`Cannot write file ${args.file_path}: ${error}`);
    }
}

export async function handleFuzzyEditFileTool(
    args: z.infer<typeof FUZZY_EDIT_FILE_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
): Promise<string> {
    const sandbox = editorEngine.branches.getSandboxById(args.branchId);
    if (!sandbox) {
        throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
    }
    const exists = await sandbox.fileExists(args.file_path);
    if (!exists) {
        throw new Error('File does not exist');
    }
    const originalFile = await sandbox.readFile(args.file_path);

    if (!originalFile) {
        throw new Error('Error reading file');
    }

    if (originalFile.type === 'binary') {
        throw new Error('Binary files are not supported for editing');
    }

    const metadata = {
        projectId: editorEngine.projectId,
        conversationId: editorEngine.chat.conversation.current?.conversation.id,
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

    const result = await sandbox.writeFile(args.file_path, updatedContent.result);
    if (!result) {
        throw new Error('Error editing file');
    }
    return 'File edited!';
}

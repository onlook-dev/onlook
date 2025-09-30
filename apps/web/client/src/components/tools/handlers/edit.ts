import type { EditorEngine } from '@/components/store/editor/engine';
import { api } from '@/trpc/client';
import {
    FUZZY_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_EDIT_FILE_TOOL_PARAMETERS,
    SEARCH_REPLACE_MULTI_EDIT_FILE_TOOL_PARAMETERS,
    UPLOAD_IMAGE_TOOL_PARAMETERS,
    VIEW_IMAGE_TOOL_PARAMETERS,
    WRITE_FILE_TOOL_PARAMETERS
} from '@onlook/ai';
import { MessageContextType } from '@onlook/models';
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

        const originalContent = file.content;
        let content = originalContent;

        // Validate only the first non-replace_all edit against original content
        // Sequential edits will be validated during application
        let tempContent = originalContent;
        for (const edit of args.edits) {
            if (!edit.replace_all) {
                const firstIndex = tempContent.indexOf(edit.old_string);
                if (firstIndex === -1) {
                    throw new Error(`String not found in file: ${edit.old_string}`);
                }

                const secondIndex = tempContent.indexOf(edit.old_string, firstIndex + edit.old_string.length);
                if (secondIndex !== -1) {
                    throw new Error(`Multiple occurrences found for "${edit.old_string}". Use replace_all=true or provide more context.`);
                }

                // Simulate the edit for next validation
                tempContent = tempContent.replace(edit.old_string, edit.new_string);
            } else {
                tempContent = tempContent.replaceAll(edit.old_string, edit.new_string);
            }
        }

        // Apply edits sequentially in the order provided
        // Each edit operates on the result of the previous edit
        for (const edit of args.edits) {
            if (edit.replace_all) {
                content = content.replaceAll(edit.old_string, edit.new_string);
            } else {
                const index = content.indexOf(edit.old_string);
                if (index === -1) {
                    throw new Error(`String not found in file after previous edits: ${edit.old_string}`);
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
        throw new Error(`Cannot multi-edit file ${args.file_path}: ${(error as Error).message}`);
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

    const result = await sandbox.writeFile(args.file_path, updatedContent.result);
    if (!result) {
        throw new Error('Error editing file');
    }
    return 'File edited!';
}

export async function handleViewImageTool(args: z.infer<typeof VIEW_IMAGE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{ image: { mimeType: string; data: string }; message: string }> {
    try {
        // Find the image in the chat context by reference
        const context = editorEngine.chat.context.context;
        const imageContext = context.find((ctx) => {
            if (ctx.type !== MessageContextType.IMAGE) {
                return false;
            }
            // Try to match by display name, index number, or description
            const ref = args.image_reference.toLowerCase();
            return ctx.displayName.toLowerCase().includes(ref) ||
                   ref.includes(ctx.displayName.toLowerCase()) ||
                   ref.match(/^\d+$/) && context.filter(c => c.type === MessageContextType.IMAGE)[parseInt(ref) - 1] === ctx;
        });

        if (!imageContext || imageContext.type !== MessageContextType.IMAGE) {
            // Try to find by index number
            const imageContexts = context.filter(ctx => ctx.type === MessageContextType.IMAGE);
            const indexMatch = args.image_reference.match(/^\d+$/);
            if (indexMatch) {
                const index = parseInt(indexMatch[0]) - 1;
                if (index >= 0 && index < imageContexts.length) {
                    const foundImage = imageContexts[index];
                    if (foundImage && foundImage.type === MessageContextType.IMAGE) {
                        return {
                            image: {
                                mimeType: foundImage.mimeType,
                                data: foundImage.content,
                            },
                            message: `Retrieved image "${foundImage.displayName}" for analysis.`,
                        };
                    }
                }
            }

            throw new Error(`No image found matching reference: ${args.image_reference}`);
        }

        return {
            image: {
                mimeType: imageContext.mimeType,
                data: imageContext.content,
            },
            message: `Retrieved image "${imageContext.displayName}" for analysis.`,
        };
    } catch (error) {
        throw new Error(`Cannot view image: ${error}`);
    }
}

export async function handleUploadImageTool(args: z.infer<typeof UPLOAD_IMAGE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const sandbox = editorEngine.branches.getSandboxById(args.branchId);
        if (!sandbox) {
            throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
        }

        // Find the image in the chat context by reference
        const context = editorEngine.chat.context.context;
        const imageContext = context.find((ctx) => {
            if (ctx.type !== MessageContextType.IMAGE) {
                return false;
            }
            // Try to match by display name or description
            return ctx.displayName.toLowerCase().includes(args.image_reference.toLowerCase()) ||
                   args.image_reference.toLowerCase().includes(ctx.displayName.toLowerCase());
        });

        if (!imageContext || imageContext.type !== MessageContextType.IMAGE) {
            // Try to find the most recent image if no specific match
            const recentImages = context.filter(ctx => ctx.type === MessageContextType.IMAGE);
            if (recentImages.length === 0) {
                throw new Error(`No image found matching reference: ${args.image_reference}`);
            }

            // Use the most recent image if no specific match
            const mostRecentImage = recentImages[recentImages.length - 1];
            if (!mostRecentImage || mostRecentImage.type !== MessageContextType.IMAGE) {
                throw new Error(`No image found matching reference: ${args.image_reference}`);
            }

            console.warn(`No exact match for "${args.image_reference}", using most recent image: ${mostRecentImage.displayName}`);

            // Extract MIME type and file extension
            const mimeType = mostRecentImage.mimeType;
            const extension = getExtensionFromMimeType(mimeType);

            // Generate filename
            const filename = args.filename ? `${args.filename}.${extension}` : `${generateUUID()}.${extension}`;

            // Determine destination path
            const destinationPath = args.destination_path || 'public/assets/images';
            const fullPath = `${destinationPath}/${filename}`;

            // Convert base64 to binary data
            const base64Data = mostRecentImage.content.replace(/^data:image\/[a-z]+;base64,/, '');
            const binaryData = base64ToUint8Array(base64Data);

            // Upload to sandbox
            await sandbox.writeBinaryFile(fullPath, binaryData);

            // Refresh image scanning to update the UI
            await editorEngine.image.scanImages();

            return `Image "${mostRecentImage.displayName}" uploaded successfully to ${fullPath}`;
        }

        // Extract MIME type and file extension
        const mimeType = imageContext.mimeType;
        const extension = getExtensionFromMimeType(mimeType);

        // Generate filename
        const filename = args.filename ? `${args.filename}.${extension}` : `${generateUUID()}.${extension}`;

        // Determine destination path
        const destinationPath = args.destination_path || 'public/assets/images';
        const fullPath = `${destinationPath}/${filename}`;

        // Convert base64 to binary data
        const base64Data = imageContext.content.replace(/^data:image\/[a-z]+;base64,/, '');
        const binaryData = base64ToUint8Array(base64Data);

        // Upload to sandbox
        await sandbox.writeBinaryFile(fullPath, binaryData);

        // Refresh image scanning to update the UI
        await editorEngine.image.scanImages();

        return `Image "${imageContext.displayName}" uploaded successfully to ${fullPath}`;
    } catch (error) {
        throw new Error(`Cannot upload image: ${error}`);
    }
}

function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff',
    };
    return mimeToExt[mimeType.toLowerCase()] || 'png';
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { MessageContextType } from '@onlook/models';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class UploadImageTool extends ClientTool {
    static readonly toolName = 'upload_image';
    static readonly description = "Uploads an image from the chat context to the project's file system. Use this tool when the user asks you to save, add, or upload an image to their project. The image will be stored in the project's public directory and can be referenced in code. After uploading, you can use the file path in your code changes.";
    static readonly parameters = z.object({
        image_reference: z
            .string()
            .describe(
                'Reference to an image in the chat context (use the display name or index number)',
            ),
        destination_path: z
            .string()
            .optional()
            .describe('Destination path within the project (default: "public/assets/images")'),
        filename: z
            .string()
            .optional()
            .describe('Custom filename (without extension). If not provided, a UUID will be generated'),
        branchId: BRANCH_ID_SCHEMA,
    });
    static readonly icon = Icons.Image;

    async handle(
        args: z.infer<typeof UploadImageTool.parameters>,
        editorEngine: EditorEngine
    ): Promise<string> {
        try {
            const sandbox = editorEngine.branches.getSandboxById(args.branchId);
            if (!sandbox) {
                throw new Error(`Sandbox not found for branch ID: ${args.branchId}`);
            }

            const context = editorEngine.chat.context.context;
            const imageContext = context.find((ctx) => {
                if (ctx.type !== MessageContextType.IMAGE) {
                    return false;
                }
                return ctx.displayName.toLowerCase().includes(args.image_reference.toLowerCase()) ||
                       args.image_reference.toLowerCase().includes(ctx.displayName.toLowerCase());
            });

            if (!imageContext || imageContext.type !== MessageContextType.IMAGE) {
                const recentImages = context.filter(ctx => ctx.type === MessageContextType.IMAGE);
                if (recentImages.length === 0) {
                    throw new Error(`No image found matching reference: ${args.image_reference}`);
                }

                const mostRecentImage = recentImages[recentImages.length - 1];
                if (!mostRecentImage || mostRecentImage.type !== MessageContextType.IMAGE) {
                    throw new Error(`No image found matching reference: ${args.image_reference}`);
                }

                console.warn(`No exact match for "${args.image_reference}", using most recent image: ${mostRecentImage.displayName}`);

                const fullPath = await this.uploadImageToSandbox(mostRecentImage, args, sandbox);
                await editorEngine.image.scanImages();

                return `Image "${mostRecentImage.displayName}" uploaded successfully to ${fullPath}`;
            }

            const fullPath = await this.uploadImageToSandbox(imageContext, args, sandbox);
            await editorEngine.image.scanImages();

            return `Image "${imageContext.displayName}" uploaded successfully to ${fullPath}`;
        } catch (error) {
            throw new Error(`Cannot upload image: ${error}`);
        }
    }

    getLabel(input?: z.infer<typeof UploadImageTool.parameters>): string {
        if (input?.image_reference) {
            return 'Uploading image ' + input.image_reference.substring(0, 20);
        }
        return 'Uploading image';
    }

    private async uploadImageToSandbox(
        imageContext: Extract<import('@onlook/models').MessageContext, { type: MessageContextType.IMAGE }>,
        args: z.infer<typeof UploadImageTool.parameters>,
        sandbox: any
    ): Promise<string> {
        const mimeType = imageContext.mimeType;
        const extension = this.getExtensionFromMimeType(mimeType);
        const filename = args.filename ? `${args.filename}.${extension}` : `${uuidv4()}.${extension}`;
        const destinationPath = args.destination_path || 'public/assets/images';
        const fullPath = `${destinationPath}/${filename}`;
        const base64Data = imageContext.content.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const binaryData = this.base64ToUint8Array(base64Data);
        await sandbox.writeBinaryFile(fullPath, binaryData);
        return fullPath;
    }

    private getExtensionFromMimeType(mimeType: string): string {
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

    private base64ToUint8Array(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
}
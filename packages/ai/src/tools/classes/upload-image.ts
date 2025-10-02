import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { MessageContextType, type MessageContext } from '@onlook/models';
import mime from 'mime-lite';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { ClientTool } from '../models/client';
import { BRANCH_ID_SCHEMA } from '../shared/type';

export class UploadImageTool extends ClientTool {
    static readonly toolName = 'upload_image';
    static readonly description = "Uploads an image from the chat context to the project's file system. Use this tool when the user asks you to save, add, or upload an image to their project. The image will be stored in public/images/ directory by default and can be referenced in code. After uploading, you can use the file path in your code changes.";
    static readonly parameters = z.object({
        image_id: z
            .string()
            .describe(
                'The unique ID of the image from the available images list',
            ),
        destination_path: z
            .string()
            .optional()
            .describe('Destination path within the project. Defaults to "public/images" if not specified.'),
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
            const imageContext = context.find((ctx) =>
                ctx.type === MessageContextType.IMAGE && ctx.id === args.image_id
            );

            if (!imageContext || imageContext.type !== MessageContextType.IMAGE) {
                throw new Error(`No image found with ID: ${args.image_id}`);
            }

            const fullPath = await this.uploadImageToSandbox(imageContext, args, sandbox);
            await editorEngine.image.scanImages();

            return `Image "${imageContext.displayName}" uploaded successfully to ${fullPath}`;
        } catch (error) {
            throw new Error(`Cannot upload image: ${error}`);
        }
    }

    getLabel(input?: z.infer<typeof UploadImageTool.parameters>): string {
        if (input?.image_id) {
            return 'Uploading image ' + input.image_id.substring(0, 20);
        }
        return 'Uploading image';
    }

    private async uploadImageToSandbox(
        imageContext: Extract<MessageContext, { type: MessageContextType.IMAGE }>,
        args: z.infer<typeof UploadImageTool.parameters>,
        sandbox: any
    ): Promise<string> {
        const mimeType = imageContext.mimeType;
        const extension = mime.getExtension(mimeType) || 'png';
        const filename = args.filename ? `${args.filename}.${extension}` : `${uuidv4()}.${extension}`;
        const destinationPath = args.destination_path?.trim() || 'public/images';
        const fullPath = `${destinationPath}/${filename}`;
        const base64Data = imageContext.content.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const binaryData = this.base64ToUint8Array(base64Data);
        await sandbox.writeBinaryFile(fullPath, binaryData);
        return fullPath;
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
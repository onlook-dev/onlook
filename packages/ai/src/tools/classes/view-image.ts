import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { MessageContextType } from '@onlook/models';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class ViewImageTool extends ClientTool {
    static readonly toolName = 'view_image';
    static readonly description = "Retrieves and views an image from the chat context for analysis. Use this tool when the user asks you to analyze, describe, or work with an image they've attached. The image data will be returned so you can see and analyze its contents. This does NOT save the image to the project.";
    static readonly parameters = z.object({
        image_id: z
            .string()
            .describe(
                'The unique ID of the image from the available images list',
            ),
    });
    static readonly icon = Icons.Image;

    async handle(
        args: z.infer<typeof ViewImageTool.parameters>,
        editorEngine: EditorEngine
    ): Promise<{ image: { mimeType: string; data: string }; message: string }> {
        try {
            const context = editorEngine.chat.context.context;
            const imageContext = context.find((ctx) =>
                ctx.type === MessageContextType.IMAGE && ctx.id === args.image_id
            );

            if (!imageContext || imageContext.type !== MessageContextType.IMAGE) {
                throw new Error(`No image found with ID: ${args.image_id}`);
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

    getLabel(input?: z.infer<typeof ViewImageTool.parameters>): string {
        if (input?.image_id) {
            return 'Viewing image ' + input.image_id.substring(0, 20);
        }
        return 'Viewing image';
    }
}
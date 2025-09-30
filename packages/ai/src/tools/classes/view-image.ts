import { Icons } from '@onlook/ui/icons';
import type { EditorEngine } from '@onlook/web-client/src/components/store/editor/engine';
import { MessageContextType } from '@onlook/models';
import { z } from 'zod';
import { ClientTool } from '../models/client';

export class ViewImageTool extends ClientTool {
    static readonly toolName = 'view_image';
    static readonly description = "Retrieves and views an image from the chat context for analysis. Use this tool when the user asks you to analyze, describe, or work with an image they've attached. The image data will be returned so you can see and analyze its contents. This does NOT save the image to the project.";
    static readonly parameters = z.object({
        image_reference: z
            .string()
            .describe(
                'Reference to an image in the chat context (use the display name or index number)',
            ),
    });
    static readonly icon = Icons.Image;

    async handle(
        args: z.infer<typeof ViewImageTool.parameters>,
        editorEngine: EditorEngine
    ): Promise<{ image: { mimeType: string; data: string }; message: string }> {
        try {
            const context = editorEngine.chat.context.context;
            const imageContext = context.find((ctx) => {
                if (ctx.type !== MessageContextType.IMAGE) {
                    return false;
                }
                const ref = args.image_reference.toLowerCase();
                return ctx.displayName.toLowerCase().includes(ref) ||
                       ref.includes(ctx.displayName.toLowerCase()) ||
                       ref.match(/^\d+$/) && context.filter(c => c.type === MessageContextType.IMAGE)[parseInt(ref) - 1] === ctx;
            });

            if (!imageContext || imageContext.type !== MessageContextType.IMAGE) {
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

    getLabel(input?: z.infer<typeof ViewImageTool.parameters>): string {
        if (input?.image_reference) {
            return 'Viewing image ' + input.image_reference.substring(0, 20);
        }
        return 'Viewing image';
    }
}
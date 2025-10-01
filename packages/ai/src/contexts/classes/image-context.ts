import { MessageContextType, type ImageMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { BaseContext } from '../models/base';

export class ImageContext extends BaseContext {
    static readonly contextType = MessageContextType.IMAGE;
    static readonly displayName = 'Image';
    static readonly icon = Icons.Image;

    static getPrompt(context: ImageMessageContext): string {
        // Images don't generate text prompts - they're handled as file attachments
        return `[Image: ${context.mimeType}]`;
    }

    static getLabel(context: ImageMessageContext): string {
        return context.displayName || 'Image';
    }

    /**
     * Convert image contexts to file UI parts for AI SDK
     */
    static toFileUIParts(images: ImageMessageContext[]) {
        return images.map((i) => ({
            type: 'file' as const,
            mediaType: i.mimeType,
            url: i.content,
        }));
    }
}
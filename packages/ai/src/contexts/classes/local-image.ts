import { MessageContextType, type LocalImageMessageContext } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { BaseContext } from '../models/base';

export class LocalImageContext extends BaseContext {
    static readonly contextType = MessageContextType.LOCAL_IMAGE;
    static readonly displayName = 'Local Image';
    static readonly icon = Icons.Image;

    static getPrompt(context: LocalImageMessageContext): string {
        // For local images, include the path so AI knows it already exists in the project
        return `Image file already in project at path: ${context.path}`;
    }

    static getLabel(context: LocalImageMessageContext): string {
        return context.displayName || 'Local Image';
    }
}

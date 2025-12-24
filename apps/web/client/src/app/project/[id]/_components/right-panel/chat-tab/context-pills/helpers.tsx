import { getContextClass, getContextLabel } from '@onlook/ai';
import { DefaultSettings } from '@onlook/constants';
import { MessageContextType, type MessageContext } from '@onlook/models/chat';
import { NodeIcon } from '@onlook/ui/node-icon';
import { getTruncatedFileName } from '@onlook/ui/utils';

export function getTruncatedName(context: MessageContext) {
    let name = getContextLabel(context);

    if (context.type === MessageContextType.FILE || context.type === MessageContextType.IMAGE) {
        name = getTruncatedFileName(name);
    }
    if (context.type === MessageContextType.HIGHLIGHT) {
        name = name.toLowerCase();
    }
    return name.length > 20 ? `${name.slice(0, 20)}...` : name;
}

export function getContextIcon(context: MessageContext) {
    // Special case for highlight context which uses a custom component
    if (context.type === MessageContextType.HIGHLIGHT) {
        return (
            <NodeIcon tagName={context.displayName} iconClass="w-3 h-3 ml-1 mr-2 flex-none" />
        );
    }

    const contextClass = getContextClass(context.type);
    if (contextClass?.icon) {
        const IconComponent = contextClass.icon;
        return <IconComponent />;
    }
    return null;
}

export function validateImageLimit(
    currentImages: MessageContext[],
    additionalCount: number = 0
): {
    success: boolean;
    errorMessage?: string;
} {
    const totalCount = currentImages.length + additionalCount;
    const maxImages = DefaultSettings.CHAT_SETTINGS.maxImages;
    if (totalCount > maxImages) {
        return { success: false, errorMessage: `You can only add up to ${maxImages} images.` };
    }
    return { success: true, errorMessage: undefined };
}

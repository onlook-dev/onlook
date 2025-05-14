import { MessageContextType, type ChatMessageContext } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { getTruncatedFileName } from '@onlook/ui/utils';
import { assertNever } from '@onlook/utility';
import React from 'react';
import { NodeIcon } from '../../../left-panel/layers-tab/tree/node-icon';

export function getTruncatedName(context: ChatMessageContext) {
    let name = context.displayName;
    if (context.type === MessageContextType.FILE || context.type === MessageContextType.IMAGE) {
        name = getTruncatedFileName(name);
    }
    if (context.type === MessageContextType.HIGHLIGHT) {
        name = name.toLowerCase();
    }
    return name.length > 20 ? `${name.slice(0, 20)}...` : name;
}

export function getContextIcon(context: ChatMessageContext) {
    let icon: React.ComponentType | React.ReactElement | null = null;
    switch (context.type) {
        case MessageContextType.FILE:
            icon = Icons.File;
            break;
        case MessageContextType.IMAGE:
            icon = Icons.Image;
            break;
        case MessageContextType.ERROR:
            icon = Icons.InfoCircled;
            break;
        case MessageContextType.HIGHLIGHT:
            return (
                <NodeIcon tagName={context.displayName} iconClass="w-3 h-3 ml-1 mr-2 flex-none" />
            );
        case MessageContextType.PROJECT:
            icon = Icons.Cube;
            break;
        default:
            assertNever(context);
    }
    if (icon) {
        return React.createElement(icon);
    }
}

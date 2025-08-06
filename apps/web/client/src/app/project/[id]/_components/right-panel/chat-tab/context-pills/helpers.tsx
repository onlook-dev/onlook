import { MessageContextType, type ChatMessageContext } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
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
    if (context.type === MessageContextType.MENTION) {
        // For mentions, we want to show the name as is, but with @ prefix
        name = `@${name}`;
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
        case MessageContextType.MENTION:
            // Use the icon from the context
            switch (context.icon) {
                case 'code':
                    icon = Icons.Code;
                    break;
                case 'file':
                    icon = Icons.File;
                    break;
                case 'directory':
                case 'folder':
                    icon = Icons.Directory;
                    break;
                case 'layers':
                    icon = Icons.Layers;
                    break;
                case 'brand':
                    icon = Icons.Brand;
                    break;
                case 'image':
                    icon = Icons.Image;
                    break;
                case 'viewGrid':
                    icon = Icons.ViewGrid;
                    break;
                case 'component':
                    icon = Icons.Component;
                    break;
                case 'palette':
                    icon = Icons.Tokens;
                    break;
                case 'type':
                    icon = Icons.Text;
                    break;
                default:
                    icon = Icons.File;
                    break;
            }
            break;
        default:
            assertNever(context);
    }
    if (icon) {
        return React.createElement(icon);
    }
}

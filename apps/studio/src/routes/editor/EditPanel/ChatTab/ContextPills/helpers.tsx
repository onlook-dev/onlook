import { getTruncatedFileName } from '@/lib/utils';
import { type ChatMessageContext } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import React from 'react';
import NodeIcon from '../../../LayersPanel/Tree/NodeIcon';

export function getTruncatedName(context: ChatMessageContext) {
    let name = context.displayName;
    if (context.type === 'file' || context.type === 'image') {
        name = getTruncatedFileName(name);
    }
    if (context.type === 'highlight') {
        name = name.toLowerCase();
    }
    return name.length > 20 ? `${name.slice(0, 20)}...` : name;
}

export function getContextIcon(context: ChatMessageContext) {
    let icon: React.ComponentType | React.ReactElement | null = null;
    switch (context.type) {
        case 'file':
            icon = Icons.File;
            break;
        case 'image':
            icon = Icons.Image;
            break;
        case 'error':
            icon = Icons.InfoCircled;
            break;
        case 'highlight':
            return (
                <NodeIcon tagName={context.displayName} iconClass="w-3 h-3 ml-1 mr-2 flex-none" />
            );
    }
    if (icon) {
        return React.createElement(icon);
    }
}

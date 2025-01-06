import React from 'react';
import { type ChatMessageContext, MessageContextType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { getTruncatedName } from './helpers';

export function DraftingImagePill({
    context,
    onRemove,
}: {
    context: ChatMessageContext;
    onRemove: () => void;
}) {
    if (context.type !== MessageContextType.IMAGE) {
        console.warn('DraftingImagePill received non-image context');
        return null;
    }

    return (
        <span
            className="group relative flex flex-row items-center gap-1 justify-center border bg-background-tertiary py-0.5 px-1 rounded-md"
            key={context.displayName}
        >
            {/* Left side: Image thumbnail */}
            <div className="w-8 h-8 flex items-center justify-center">
                <img
                    src={context.content}
                    alt={context.displayName}
                    className="max-w-full max-h-full object-cover rounded"
                />
            </div>

            {/* Right side: Filename */}
            <span className="text-xs overflow-hidden text-ellipsis max-w-[100px]">
                {getTruncatedName(context)}
            </span>

            {/* Hover X button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute top-0 right-0 w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
                <Icons.CrossL className="w-2.5 h-2.5 text-foreground group-hover:text-foreground-active" />
            </button>
        </span>
    );
}

import React from 'react';
import { motion } from 'motion/react';

import type { MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';

import { getTruncatedName } from './helpers';

export const DraftImagePill = React.forwardRef<
    HTMLDivElement,
    {
        context: MessageContext;
        onRemove: () => void;
    }
>(({ context, onRemove }, ref) => {
    if (context.type !== MessageContextType.IMAGE) {
        console.warn('DraftingImagePill received non-image context');
        return null;
    }

    return (
        <motion.span
            layout="position"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.2,
                layout: {
                    duration: 0.15,
                    ease: 'easeOut',
                },
            }}
            className="group bg-background-tertiary relative flex h-7 flex-row items-center justify-center gap-1 rounded-md border"
            key={context.displayName}
            ref={ref}
        >
            {/* Left side: Image thumbnail */}
            <div className="relative flex h-7 w-7 items-center justify-center overflow-hidden">
                <img
                    src={context.content}
                    alt={context.displayName}
                    className="h-full w-full rounded-l-md object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-l-md border-y-[1px] border-l-[1px] border-white/10" />
            </div>

            {/* Right side: Filename */}
            <span className="max-w-[100px] overflow-hidden pr-1 text-xs text-ellipsis whitespace-nowrap">
                {getTruncatedName(context)}
            </span>

            {/* Hover X button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="bg-primary absolute -top-1.5 -right-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            >
                <Icons.CrossL className="text-primary-foreground h-2.5 w-2.5" />
            </button>
        </motion.span>
    );
});

DraftImagePill.displayName = 'DraftImagePill';

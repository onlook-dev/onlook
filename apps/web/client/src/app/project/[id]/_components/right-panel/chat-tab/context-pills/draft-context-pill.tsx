import React from 'react';
import { motion } from 'motion/react';

import type { MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { getContextIcon, getTruncatedName } from './helpers';

export const DraftContextPill = React.forwardRef<
    HTMLDivElement,
    {
        context: MessageContext;
        onRemove: () => void;
    }
>(({ context, onRemove }, ref) => {
    const isBranch = context.type === MessageContextType.BRANCH;

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
            className={cn(
                'group border-foreground-tertiary/20 relative flex h-7 flex-row items-center justify-center gap-1 rounded-md border px-2',
                isBranch
                    ? 'border-teal-800 bg-teal-900 text-teal-200'
                    : 'bg-background-tertiary/50 text-foreground-secondary',
            )}
            ref={ref}
        >
            <div className="flex w-4 items-center justify-center text-center">
                <div>{getContextIcon(context)}</div>
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
            </div>
            <span className="text-xs">{getTruncatedName(context)}</span>
        </motion.span>
    );
});

DraftContextPill.displayName = 'DraftContextPill';

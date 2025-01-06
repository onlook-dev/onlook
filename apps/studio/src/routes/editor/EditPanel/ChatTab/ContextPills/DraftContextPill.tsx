import { type ChatMessageContext } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { getContextIcon, getTruncatedName } from './helpers';
import { motion } from 'motion/react';

export function DraftContextPill({
    context,
    onRemove,
}: {
    context: ChatMessageContext;
    onRemove: () => void;
}) {
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
            className="group relative flex flex-row items-center gap-1 justify-center border bg-background-tertiary rounded-md h-7 px-2"
        >
            <div className="w-4 flex text-center items-center justify-center">
                <div>{getContextIcon(context)}</div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 p-1 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                    <Icons.CrossL className="w-2.5 h-2.5 text-primary-foreground" />
                </button>
            </div>
            <span className="text-xs">{getTruncatedName(context)}</span>
        </motion.span>
    );
}

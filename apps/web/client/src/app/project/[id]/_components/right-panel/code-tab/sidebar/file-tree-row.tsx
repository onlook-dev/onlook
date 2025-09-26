import { cn } from '@onlook/ui/utils';
import { forwardRef } from 'react';
import type { RowRendererProps } from 'react-arborist';
import type { FileNode } from '../types';

export const FileTreeRow = forwardRef<
    HTMLDivElement,
    RowRendererProps<FileNode> & { isHighlighted?: boolean }
>(({ attrs, children, isHighlighted }, ref) => {
    return (
        <div
            ref={ref}
            {...attrs}
            className={cn(
                'outline-none h-6 cursor-pointer min-w-0 w-auto rounded',
                'text-foreground-onlook/70',
                'hover:bg-red-500/90 dark:hover:bg-red-500/90',
                attrs['aria-selected'] ? [
                    'bg-red-500/90 dark:bg-red-500/90',
                    'text-primary dark:text-primary',
                ] : [
                    isHighlighted && 'bg-background-onlook text-foreground-primary',
                ],
            )}
        >
            {children}
        </div>
    );
});

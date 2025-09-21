import type { FileNode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { forwardRef } from 'react';
import type { RowRendererProps } from 'react-arborist';

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
                attrs['aria-selected'] ? [
                    'bg-red-500/90 dark:bg-red-500/90',
                    'text-primary dark:text-primary',
                    'hover:bg-red-500/90 dark:hover:bg-red-500/90',
                ] : [
                    isHighlighted && 'bg-background-onlook text-foreground-primary',
                    'hover:text-foreground-primary hover:bg-background-onlook',
                ],
            )}
        >
            {children}
        </div>
    );
});

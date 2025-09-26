import type { FileEntry } from '@onlook/file-system/hooks';
import { cn } from '@onlook/ui/utils';
import type { RowRendererProps } from 'react-arborist';

export const FileTreeRow = ({ attrs, children, isHighlighted }: RowRendererProps<FileEntry> & { isHighlighted?: boolean }) => {
    return (
        <div
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
};

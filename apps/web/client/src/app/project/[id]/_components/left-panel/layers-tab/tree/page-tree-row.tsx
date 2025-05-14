import type { PageNode } from '@onlook/models/pages';
import { cn } from '@onlook/ui/utils';
import { forwardRef } from 'react';
import type { RowRendererProps } from 'react-arborist';

export const PageTreeRow = forwardRef<
    HTMLDivElement,
    RowRendererProps<PageNode> & { isHighlighted?: boolean }
>(({ attrs, children, isHighlighted }, ref) => {
    return (
        <div
            ref={ref}
            {...attrs}
            className={cn(
                'outline-none h-6 cursor-pointer w-full rounded',
                'text-foreground-onlook/70',
                !attrs['aria-selected'] && [
                    isHighlighted && 'bg-background-onlook text-foreground-primary',
                    'hover:text-foreground-primary hover:bg-background-onlook',
                ],
                attrs['aria-selected'] && [
                    '!bg-[#FA003C] dark:!bg-[#FA003C]',
                    '!text-primary dark:!text-primary',
                    '![&]:hover:bg-[#FA003C] dark:[&]:hover:bg-[#FA003C]',
                ],
            )}
        >
            {children}
        </div>
    );
});

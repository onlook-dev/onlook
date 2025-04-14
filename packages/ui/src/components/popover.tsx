import React from 'react';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../utils';

const popoverVariants = cva([
    'z-1000',
    'border',
    'rounded-md',
    'bg-popover',
    'text-popover-foreground text-sm font-normal',
    'shadow-md',
    'outline-hidden',
    'p-3',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
]);

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverClose = PopoverPrimitive.Close;

export interface PopoverProps
    extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>,
        VariantProps<typeof popoverVariants> {}

const PopoverContent = React.forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, children, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn(popoverVariants(), className)}
            {...props}
        >
            {children}
        </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

type PopoverScrollAreaProps = React.PropsWithChildren<{
    className?: string;
}>;

const PopoverScrollArea: React.FC<PopoverScrollAreaProps> = ({ className, children }) => {
    return (
        <ScrollArea.Root className={cn('w-full h-full', className)} type="auto">
            <ScrollArea.Viewport className="w-full h-full">{children}</ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="w-3 pr-1 py-2 -mr-[20px]">
                <ScrollArea.Thumb className="bg-grey-200 w-2 rounded-lg" />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
};

interface PopoverSeparatorProps
    extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
    fullLength?: boolean;
}

const PopoverSeparator = React.forwardRef<
    React.ElementRef<typeof SeparatorPrimitive.Root>,
    PopoverSeparatorProps
>(({ className, orientation = 'horizontal', fullLength = false, ...props }, ref) => (
    <div className="w-full">
        <SeparatorPrimitive.Root
            ref={ref}
            decorative
            orientation={orientation}
            className={cn(
                'shrink-0 bg-border',
                orientation === 'horizontal' ? 'h-[1px] w-fill' : 'h-fill w-[1px]',
                fullLength && orientation === 'horizontal' ? '-ml-2 -mr-[20px]' : '',
                className,
            )}
            {...props}
        />
    </div>
));
PopoverSeparator.displayName = SeparatorPrimitive.Root.displayName;

type PopoverHeaderProps = React.PropsWithChildren<{
    className?: string;
}>;

const PopoverHeader: React.FC<PopoverHeaderProps> = ({ className, children }) => {
    return (
        <>
            <div className={cn('w-full pb-4', className)}>{children}</div>
            <PopoverSeparator fullLength />
        </>
    );
};

type PopoverFooterProps = React.PropsWithChildren<{
    className?: string;
}>;

const PopoverFooter: React.FC<PopoverFooterProps> = ({ className, children }) => {
    return (
        <div className="w-full -mb-3">
            <PopoverSeparator fullLength />
            <div className={cn('py-2', className)}>{children}</div>
        </div>
    );
};

export {
    Popover,
    PopoverAnchor,
    PopoverClose,
    PopoverContent,
    PopoverFooter,
    PopoverHeader,
    PopoverScrollArea,
    PopoverSeparator,
    PopoverTrigger,
};

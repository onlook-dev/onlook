import { cn } from '../utils';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const toggleVariants = cva(
    'inline-flex items-center justify-center rounded text-sm text-foreground-onlook font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-foreground-active',
    {
        variants: {
            variant: {
                default: 'bg-transparent',
                outline:
                    'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
                overline:
                    'bg-transparent hover:bg-surface hover:text-muted-foreground data-[state=on]:border-text-primary data-[state=on]:bg-transparent border-t-2 border-transparent rounded-none',
                ['custom-overline']:
                    'bg-transparent hover:bg-surface hover:text-muted-foreground data-[state=on]:border-text-primary data-[state=on]:bg-transparent border-transparent rounded-none',
            },
            size: {
                default: 'h-9 px-3',
                sm: 'h-8 px-2',
                lg: 'h-10 px-3',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

const Toggle = React.forwardRef<
    React.ElementRef<typeof TogglePrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
        VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
    <TogglePrimitive.Root
        ref={ref}
        className={cn(toggleVariants({ variant, size, className }))}
        {...props}
    />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };

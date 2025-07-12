import { Button } from '@onlook/ui/button';
import { cn } from '@onlook/ui/utils';
import { forwardRef } from 'react';

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isOpen?: boolean;
    variant?: 'default' | 'ghost';
    size?: 'toolbar' | 'default';
    children: React.ReactNode;
    enableFocusStyles?: boolean;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
    ({ isOpen = false, variant = 'ghost', size = 'toolbar', enableFocusStyles = false, className, children, ...props }, ref) => {
        const baseClasses = [
            // Base styles
            'border-border/0',
            'text-muted-foreground', 
            'cursor-pointer',
            'rounded-lg',
            'border',
            'h-9',
            
            // Hover styles
            'hover:bg-background-tertiary/20',
            'hover:border-border',
            'hover:text-white',
        ];

        const focusClasses = enableFocusStyles ? [
            'focus:bg-background-tertiary/20',
            'focus:ring-border',
            'focus:ring-1',
            'focus:outline-none',
            'focus-within:bg-background-tertiary/20',
            'focus-within:border-border',
            'focus-within:text-white',
            'focus-visible:ring-0',
            'focus-visible:ring-offset-0',
        ] : [];

        const openClasses = isOpen ? [
            'bg-background-tertiary/20',
            'border-border',
            'text-white'
        ] : [];

        const allClasses = cn(
            ...baseClasses,
            ...focusClasses,
            ...openClasses,
            className
        );

        return (
            <Button
                ref={ref}
                variant={variant}
                size={size}
                className={allClasses}
                {...props}
            >
                {children}
            </Button>
        );
    }
);

ToolbarButton.displayName = 'ToolbarButton'; 
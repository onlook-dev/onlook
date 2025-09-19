import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils';

const loaderVariants = cva(
    'animate-spin rounded-full border-2 border-current border-t-transparent',
    {
        variants: {
            size: {
                sm: 'h-4 w-4',
                default: 'h-6 w-6',
                lg: 'h-8 w-8',
            },
            variant: {
                default: 'text-muted-foreground',
                primary: 'text-primary',
                secondary: 'text-secondary-foreground',
            },
        },
        defaultVariants: {
            size: 'default',
            variant: 'default',
        },
    },
);

interface LoaderProps extends React.ComponentProps<'div'>, VariantProps<typeof loaderVariants> {}

function Loader({ className, size, variant, ...props }: LoaderProps) {
    return (
        <div
            data-slot="ai-loader"
            className={cn(loaderVariants({ size, variant, className }))}
            {...props}
        />
    );
}

function TypingIndicator({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-typing-indicator"
            className={cn('flex items-center gap-1', className)}
            {...props}
        >
            <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
            </div>
        </div>
    );
}

function StreamingText({
    text,
    className,
    speed = 50,
    ...props
}: React.ComponentProps<'span'> & {
    text: string;
    speed?: number;
}) {
    const [displayText, setDisplayText] = React.useState('');
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayText(text.slice(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, speed);

            return () => clearTimeout(timer);
        }
    }, [currentIndex, text, speed]);

    React.useEffect(() => {
        setDisplayText('');
        setCurrentIndex(0);
    }, [text]);

    return (
        <span data-slot="ai-streaming-text" className={cn('inline-block', className)} {...props}>
            {displayText}
            {currentIndex < text.length && <span className="animate-pulse">|</span>}
        </span>
    );
}

export { Loader, StreamingText, TypingIndicator, loaderVariants };

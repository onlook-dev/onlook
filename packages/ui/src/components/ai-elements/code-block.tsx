import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils';

const codeBlockVariants = cva('relative rounded-lg border bg-muted/50 font-mono text-sm', {
    variants: {
        size: {
            sm: 'p-2 text-xs',
            default: 'p-4 text-sm',
            lg: 'p-6 text-base',
        },
    },
    defaultVariants: {
        size: 'default',
    },
});

interface CodeBlockProps
    extends React.ComponentProps<'pre'>,
        VariantProps<typeof codeBlockVariants> {
    code?: string;
    language?: string;
    filename?: string;
    copyable?: boolean;
    hideHeader?: boolean;
}

function CodeBlock({
    className,
    size,
    code,
    language,
    filename,
    copyable = true,
    children,
    hideHeader = true,
    ...props
}: CodeBlockProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(() => {
        if (code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [code]);

    return (
        <div data-slot="ai-code-block" className="relative">
            {!hideHeader && (filename || language || copyable) && (
                <div className="flex items-center justify-between rounded-t-lg border border-b-0 bg-muted px-4 py-2">
                    <div className="flex items-center gap-2">
                        {filename && <span className="text-sm font-medium">{filename}</span>}
                        {language && (
                            <span className="text-xs text-muted-foreground uppercase">
                                {language}
                            </span>
                        )}
                    </div>
                    {copyable && code && (
                        <button
                            onClick={handleCopy}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    )}
                </div>
            )}
            <pre
                className={cn(
                    codeBlockVariants({ size }),
                    (filename || language || copyable) && 'rounded-t-none',
                    className,
                )}
                {...props}
            >
                <code>{code || children}</code>
            </pre>
        </div>
    );
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-code-block-header"
            className={cn(
                'flex items-center justify-between rounded-t-lg border border-b-0 bg-muted px-4 py-2',
                className,
            )}
            {...props}
        />
    );
}

function CodeBlockContent({ className, ...props }: React.ComponentProps<'code'>) {
    return <code data-slot="ai-code-block-content" className={cn('block', className)} {...props} />;
}

export { CodeBlock, CodeBlockContent, CodeBlockHeader, codeBlockVariants };

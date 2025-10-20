'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, memo, useContext, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../utils';
import { Button } from '../button';

type CodeBlockContextType = {
    code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
    code: '',
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
    code: string;
    language: string;
    showLineNumbers?: boolean;
    children?: ReactNode;
    isStreaming?: boolean;
};

const CodeBlockComponent = ({
    code,
    language,
    showLineNumbers = false,
    isStreaming = false,
    className,
    children,
    ...props
}: CodeBlockProps) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [debouncedCode, setDebouncedCode] = useState(code);

    // Debounce code updates when streaming to avoid expensive syntax highlighting re-renders
    useEffect(() => {
        if (isStreaming) {
            const timer = setTimeout(() => {
                setDebouncedCode(code);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            // When not streaming, update immediately
            setDebouncedCode(code);
        }
    }, [code, isStreaming]);

    return (
        <CodeBlockContext.Provider value={{ code }}>
            <div
                className={cn(
                    'relative w-full overflow-hidden rounded-md border bg-background text-foreground',
                    className,
                )}
                {...props}
            >
                <div className="relative">
                    <SyntaxHighlighter
                        className="overflow-hidden"
                        codeTagProps={{
                            className: 'font-mono text-xs',
                        }}
                        customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'hsl(var(--background-secondary))',
                            color: 'hsl(var(--foreground))',
                        }}
                        language={language}
                        lineNumberStyle={{
                            color: 'hsl(var(--muted-foreground))',
                            paddingRight: '1rem',
                            minWidth: '2.5rem',
                        }}
                        showLineNumbers={showLineNumbers}
                        style={isDark ? oneDark : oneLight}
                    >
                        {debouncedCode}
                    </SyntaxHighlighter>
                    {children && (
                        <div className="absolute top-2 right-2 flex items-center gap-2">{children}</div>
                    )}
                </div>
            </div>
        </CodeBlockContext.Provider>
    );
};

export const CodeBlock = memo(CodeBlockComponent);

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
    onCopy?: () => void;
    onError?: (error: Error) => void;
    timeout?: number;
};

export const CodeBlockCopyButton = ({
    onCopy,
    onError,
    timeout = 2000,
    children,
    className,
    ...props
}: CodeBlockCopyButtonProps) => {
    const [isCopied, setIsCopied] = useState(false);
    const { code } = useContext(CodeBlockContext);

    const copyToClipboard = async () => {
        if (typeof window === 'undefined' || !navigator.clipboard.writeText) {
            onError?.(new Error('Clipboard API not available'));
            return;
        }

        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            onCopy?.();
            setTimeout(() => setIsCopied(false), timeout);
        } catch (error) {
            onError?.(error as Error);
        }
    };

    const Icon = isCopied ? CheckIcon : CopyIcon;

    return (
        <Button
            className={cn('shrink-0', className)}
            onClick={copyToClipboard}
            size="icon"
            variant="ghost"
            {...props}
        >
            {children ?? <Icon size={14} />}
        </Button>
    );
};

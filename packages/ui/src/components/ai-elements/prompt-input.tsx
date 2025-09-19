import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils';

const promptInputVariants = cva(
    'flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'border-input',
                ghost: 'border-transparent bg-transparent',
            },
            size: {
                sm: 'h-8 px-2 text-xs',
                default: 'min-h-10 px-3 py-2',
                lg: 'min-h-12 px-4 py-3 text-base',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

interface PromptInputProps
    extends Omit<React.ComponentProps<'textarea'>, 'onChange' | 'onSubmit'>,
        VariantProps<typeof promptInputVariants> {
    onSubmit?: (value: string) => void;
    loading?: boolean;
    multiline?: boolean;
    submitOnEnter?: boolean;
    maxLength?: number;
}

const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(
    (
        {
            className,
            variant,
            size,
            onSubmit,
            loading = false,
            multiline = true,
            submitOnEnter = true,
            maxLength,
            ...props
        },
        ref,
    ) => {
        const [value, setValue] = React.useState('');

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (submitOnEnter && e.key === 'Enter' && !e.shiftKey && !loading) {
                e.preventDefault();
                if (value.trim()) {
                    onSubmit?.(value);
                    setValue('');
                }
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = e.target.value;
            if (!maxLength || newValue.length <= maxLength) {
                setValue(newValue);
            }
        };

        return (
            <div data-slot="ai-prompt-input" className="relative">
                <textarea
                    ref={ref}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className={cn(
                        promptInputVariants({ variant, size }),
                        multiline ? 'resize-none' : 'resize-none overflow-hidden',
                        className,
                    )}
                    rows={multiline ? 3 : 1}
                    {...props}
                />
                {maxLength && (
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {value.length}/{maxLength}
                    </div>
                )}
            </div>
        );
    },
);

PromptInput.displayName = 'PromptInput';

function PromptInputContainer({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-prompt-input-container"
            className={cn('relative flex items-end gap-2', className)}
            {...props}
        />
    );
}

function PromptInputActions({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-prompt-input-actions"
            className={cn('flex items-center gap-2', className)}
            {...props}
        />
    );
}

export { PromptInput, PromptInputActions, PromptInputContainer, promptInputVariants };

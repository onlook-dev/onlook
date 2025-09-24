'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { type ToolUIPart } from 'ai';
import { CheckCircleIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon } from 'lucide-react';

import { Badge } from '../../components/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/collapsible';
import { cn } from '../../utils/index';
import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
    <Collapsible
        className={cn('text-foreground-tertiary/80 my-1 flex flex-col p-0', className)}
        {...props}
    />
);

export type ToolHeaderProps = {
    type: ToolUIPart['type'];
    state: ToolUIPart['state'];
    className?: string;
    icon?: ReactNode;
    title?: string;
    loading?: boolean;
    showStatus?: boolean;
};

const getStatusBadge = (status: ToolUIPart['state'], showLabel = false) => {
    const labels = {
        'input-streaming': 'Pending',
        'input-available': 'Running',
        'output-available': 'Completed',
        'output-error': 'Error',
    } as const;

    const icons = {
        'input-streaming': <CircleIcon className="size-4" />,
        'input-available': <ClockIcon className="size-4 animate-pulse" />,
        'output-available': <CheckCircleIcon className="size-4 text-green-600" />,
        'output-error': <XCircleIcon className="size-4 text-red-600" />,
    } as const;

    return (
        <Badge className="gap-1.5 rounded-full text-xs" variant="outline">
            {icons[status]}
            {showLabel && labels[status]}
        </Badge>
    );
};

export const ToolHeader = ({
    className,
    type,
    state,
    icon,
    title,
    loading,
    showStatus = false,
    ...props
}: ToolHeaderProps) => (
    <CollapsibleTrigger
        className={cn('flex w-full items-center justify-between gap-4', className)}
        {...props}
    >
        <div className="flex items-center gap-2">
            {icon ? icon : <WrenchIcon className="text-muted-foreground size-4" />}
            <span
                className={cn(
                    'text-regularPlus hover:text-foreground-tertiary truncate',
                    loading &&
                        'animate-shimmer bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] filter',
                )}
            >
                {title ? title : type}
            </span>
            {showStatus && getStatusBadge(state)}
        </div>
    </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
    <CollapsibleContent
        className={cn(
            'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in text-xs outline-none',
            className,
        )}
        {...props}
    />
);

export type ToolInputProps = ComponentProps<'div'> & {
    input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
    <div className={cn('space-y-2 overflow-hidden p-1', className)} {...props}>
        <h4 className="text-muted-foreground text-xs font-medium tracking-wide capitalize">
            Parameters
        </h4>
        <CodeBlock className="m-0 p-0" code={JSON.stringify(input, null, 2)} language="json" />
    </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
    output: ToolUIPart['output'];
    errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
    if (!(output || errorText)) {
        return null;
    }

    let Output = <div>{output as ReactNode}</div>;

    if (typeof output === 'object') {
        Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
    } else if (typeof output === 'string') {
        Output = <CodeBlock code={output} language="json" />;
    }

    return (
        <div className={cn('space-y-2 p-1', className)} {...props}>
            <h4 className="text-muted-foreground text-xs font-medium tracking-wide capitalize">
                {errorText ? 'Error' : 'Result'}
            </h4>
            <div
                className={cn(
                    'overflow-x-auto rounded-md text-xs [&_table]:w-full',
                    errorText
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted/50 text-foreground',
                )}
            >
                {errorText && <div>{errorText}</div>}
                {Output}
            </div>
        </div>
    );
};

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils';

const artifactVariants = cva('rounded-lg border bg-card text-card-foreground shadow-sm', {
    variants: {
        variant: {
            default: 'bg-card',
            muted: 'bg-muted/50',
            outline: 'border-2 border-dashed',
        },
        size: {
            sm: 'p-3',
            default: 'p-4',
            lg: 'p-6',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});

interface ArtifactProps extends React.ComponentProps<'div'>, VariantProps<typeof artifactVariants> {
    title?: string;
    type?: 'code' | 'text' | 'image' | 'component';
    preview?: boolean;
}

function Artifact({
    className,
    variant,
    size,
    title,
    type = 'text',
    preview = false,
    children,
    ...props
}: ArtifactProps) {
    return (
        <div
            data-slot="ai-artifact"
            data-type={type}
            className={cn(artifactVariants({ variant, size, className }))}
            {...props}
        >
            {title && (
                <div className="mb-3 border-b pb-2">
                    <h3 className="font-semibold text-sm">{title}</h3>
                    {type && (
                        <span className="text-xs text-muted-foreground capitalize">{type}</span>
                    )}
                </div>
            )}
            <div className={cn('relative', preview && 'max-h-96 overflow-auto')}>{children}</div>
        </div>
    );
}

function ArtifactHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-artifact-header"
            className={cn('mb-3 flex items-center justify-between border-b pb-2', className)}
            {...props}
        />
    );
}

function ArtifactTitle({ className, ...props }: React.ComponentProps<'h3'>) {
    return (
        <h3
            data-slot="ai-artifact-title"
            className={cn('font-semibold text-sm', className)}
            {...props}
        />
    );
}

function ArtifactContent({ className, ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="ai-artifact-content" className={cn('relative', className)} {...props} />;
}

function ArtifactActions({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="ai-artifact-actions"
            className={cn('mt-3 flex items-center gap-2 border-t pt-2', className)}
            {...props}
        />
    );
}

export {
    Artifact,
    ArtifactActions,
    ArtifactContent,
    ArtifactHeader,
    ArtifactTitle,
    artifactVariants,
};

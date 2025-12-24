import type React from 'react';
import { cn } from '../utils';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <kbd
            className={cn(
                'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-sm border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
                className,
            )}
        >
            {children}
        </kbd>
    );
}

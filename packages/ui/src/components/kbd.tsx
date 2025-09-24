import type React from 'react';

import { cn } from '../utils';

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <kbd
            className={cn(
                'bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none',
                className,
            )}
        >
            {children}
        </kbd>
    );
}

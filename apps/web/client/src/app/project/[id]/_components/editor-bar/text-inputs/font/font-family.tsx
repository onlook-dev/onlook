'use client';

import { Icons } from '@onlook/ui/icons';
import { memo } from 'react';

export const FontFamily = memo(
    ({ name, isActive, onSetFont }: { name: string; isActive: boolean; onSetFont: () => void }) => {
        return (
            <div
                key={name}
                onClick={onSetFont}
                className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border flex items-center justify-between rounded-md border px-2 py-1.5 text-sm data-[highlighted]:text-white cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${isActive
                    ? 'bg-background-tertiary/20 border-border border text-white'
                    : ''
                    }`}
            >
                <span className="font-medium" style={{ fontFamily: name }}>
                    {name}
                </span>
                {isActive && <Icons.Check className="ml-2 h-4 w-4 text-foreground-primary" />}
            </div>
        );
    },
);

'use client';

import { memo } from 'react';

import { Icons } from '@onlook/ui/icons';

export const FontFamily = memo(
    ({ name, isActive, onSetFont }: { name: string; isActive: boolean; onSetFont: () => void }) => {
        return (
            <div
                key={name}
                onClick={onSetFont}
                className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border hover:bg-background-tertiary/20 hover:text-foreground flex cursor-pointer items-center justify-between rounded-md border px-2 py-1.5 text-sm transition-colors duration-150 data-[highlighted]:text-white ${
                    isActive ? 'bg-background-tertiary/20 border-border border text-white' : ''
                }`}
            >
                <span className="font-medium" style={{ fontFamily: name }}>
                    {name}
                </span>
                {isActive && <Icons.Check className="text-foreground-primary ml-2 h-4 w-4" />}
            </div>
        );
    },
);

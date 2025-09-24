'use client';

import { Button } from '@onlook/ui/button';

export const ImageBackground = () => {
    return (
        <Button
            variant="ghost"
            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border active:bg-background-tertiary/20 active:border-border flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border active:text-white"
        >
            <div className="relative h-5 w-5 rounded-sm">
                <div
                    className="absolute inset-0 rounded-sm"
                    style={{
                        backgroundImage: `
                        linear-gradient(45deg, #777777 25%, transparent 25%),
                        linear-gradient(-45deg, #777777 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #777777 75%),
                        linear-gradient(-45deg, transparent 75%, #777777 75%)
                    `,
                        backgroundSize: '6px 6px',
                        backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                        backgroundColor: '#888888',
                    }}
                />
            </div>
        </Button>
    );
};

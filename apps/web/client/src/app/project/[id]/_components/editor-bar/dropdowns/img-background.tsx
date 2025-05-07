'use client';

import { Button } from '@onlook/ui/button';

export const ImageBackground = () => {
    return (
        <Button
            variant="ghost"
            className="flex items-center justify-center px-2 flex-col gap-0.5 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:bg-background-tertiary/20 active:text-white active:border active:border-border"
        >
            <div className="h-5 w-5 rounded-sm relative">
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

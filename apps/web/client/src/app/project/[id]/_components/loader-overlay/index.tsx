'use client';

import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

export const LoaderOverlay = observer(() => {
    const { isWaiting } = useChatContext();

    if (!isWaiting) {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm',
                'flex items-center justify-center',
                'animate-in fade-in-0 duration-200',
                'pointer-events-auto',
            )}
            style={{ pointerEvents: 'auto' }}
        >
            <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-background/90 backdrop-blur-md border shadow-lg">
                <Icons.Shadow className="h-8 w-8 animate-spin text-foreground-primary" />
                <div className="text-lg font-medium text-foreground-primary">
                    AI is generating code...
                </div>
                <div className="text-sm text-foreground-secondary max-w-md text-center">
                    Please wait while we process your request. The page is temporarily locked to
                    prevent conflicts.
                </div>
            </div>
        </div>
    );
});

LoaderOverlay.displayName = 'LoaderOverlay';

'use client';

import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import React from 'react';

export const LoaderOverlay = observer(() => {
    const { isWaiting } = useChatContext();
    if (!isWaiting) return null;
    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-md pointer-events-auto">
            <div className="flex flex-col items-center gap-4 p-8 rounded-lg bg-background/90 backdrop-blur-md animate-in fade-in-0 duration-200 border shadow-lg">
                <div className="text-lg justify-center text-center font-medium text-foreground-primary">
                    AI is generating code...
                </div>
                <div className="text-sm text-foreground-secondary max-w-md text-center">
                    Please wait while we process your request. The canvas is temporarily locked to
                    prevent conflicts.
                </div>
                <Icons.Shadow className="h-8 w-8 animate-spin text-foreground-primary" />
            </div>
        </div>
    );
});

LoaderOverlay.displayName = 'LoaderOverlay';

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

export const LoaderOverlay = observer(() => {
    const { isWaiting } = useChatContext();

    return (
        <AlertDialog open={isWaiting} onOpenChange={() => {}}>
            <AlertDialogContent className="flex flex-col items-center gap-4 p-8 rounded-lg bg-background/90 backdrop-blur-md animate-in fade-in-0 duration-200 border shadow-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg justify-center text-center font-medium text-foreground-primary">
                        AI is generating code...
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-foreground-secondary max-w-md text-center">
                        Please wait while we process your request. The page is temporarily locked to
                        prevent conflicts.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Icons.Shadow className="h-8 w-8 animate-spin text-foreground-primary" />
            </AlertDialogContent>
        </AlertDialog>
    );
});

LoaderOverlay.displayName = 'LoaderOverlay';

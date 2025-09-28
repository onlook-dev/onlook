import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';

export const MoveImageModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    const stubImageToMove = { fileName: 'example.png' };
    const stubTargetFolder = { name: 'images' };

    // Stub handlers
    const handleMove = async () => {
        // Stub move logic
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Move Image</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to move &quot;{stubImageToMove.fileName}&quot; to &quot;{stubTargetFolder.name}&quot; folder?
                        <span className="block mt-2 text-sm">
                            This will move the image file to the selected folder location.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant={'default'}
                        className="rounded-md text-sm"
                        onClick={handleMove}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin mr-2" />
                                Moving...
                            </>
                        ) : (
                            'Move'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
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

export const FolderMoveModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    const stubFolderToMove = { name: 'Source Folder' };
    const stubTargetFolder = { name: 'Destination Folder' };

    const handleMove = async () => {
        if (!isLoading) {
            // Stub move logic
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setIsOpen(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Move Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to move &quot;{stubFolderToMove.name}&quot; to &quot;{stubTargetFolder.name}&quot;?
                        <span className="block mt-2 text-sm">
                            This will move the folder and all its contents to the selected location.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
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
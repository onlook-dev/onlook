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

export const DeleteImageModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    
    // Stub handlers
    const handleDelete = async () => {
        // Stub delete logic
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{'Delete this image?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {"This will delete the image from the project. You can't undo this action."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant={'destructive'}
                        className="rounded-md text-sm"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin mr-2" />
                                Deleting
                            </>
                        ) : (
                            'Delete'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
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

export const FolderDeleteModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    const stubFolderToDelete = { name: 'Example Folder' };

    const handleDelete = async () => {
        if (!isLoading) {
            // Stub delete logic
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
                    <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete &quot;{stubFolderToDelete.name}&quot;? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin mr-2" />
                                Deleting...
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
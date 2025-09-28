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

export const RenameImageModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    const [newImageName] = useState('example-renamed.png');
    const stubImageToRename = 'example.png';

    // Stub handlers
    const handleRename = async () => {
        // Stub rename logic
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rename Image</AlertDialogTitle>
                    <AlertDialogDescription>
                        {`Rename image to "${newImageName}"`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant={'default'} onClick={handleRename} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Icons.Reload className="w-4 h-4 animate-spin mr-2" />
                                Renaming...
                            </>
                        ) : (
                            'Rename'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
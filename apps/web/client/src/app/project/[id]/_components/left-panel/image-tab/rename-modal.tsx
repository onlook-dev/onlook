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
import { useImagesContext } from './providers/images-provider';

export const RenameImageModal = () => {
    const { renameOperations } = useImagesContext();
    const { renameState, onRenameImage, handleRenameModalToggle } = renameOperations;

    const handleRename = async () => {
        if (!renameState.isLoading) {
            await onRenameImage(renameState.newImageName);
        }
    };

    const handleClose = () => {
        if (!renameState.isLoading) {
            handleRenameModalToggle();
        }
    };

    return (
        <AlertDialog open={!!renameState.imageToRename && !!renameState.newImageName && renameState.newImageName !== renameState.imageToRename} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rename Image</AlertDialogTitle>
                    <AlertDialogDescription>
                        {`Rename image to "${renameState.newImageName}"`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={renameState.isLoading}>
                        Cancel
                    </Button>
                    <Button variant={'default'} onClick={handleRename} disabled={renameState.isLoading}>
                        {renameState.isLoading ? (
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
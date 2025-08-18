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

export const MoveImageModal = () => {
    const { moveOperations } = useImagesContext();
    const { moveState, moveImageToFolder, handleMoveModalToggle } = moveOperations;

    const handleMove = async () => {
        if (!moveState.isLoading) {
            await moveImageToFolder();
        }
    };

    const handleClose = () => {
        if (!moveState.isLoading) {
            handleMoveModalToggle();
        }
    };

    return (
        <AlertDialog open={!!moveState.imageToMove && !!moveState.targetFolder} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Move Image</AlertDialogTitle>
                    <AlertDialogDescription>
                        {moveState.imageToMove && moveState.targetFolder && (
                            <>
                                Are you sure you want to move &quot;{moveState.imageToMove.fileName}&quot; to &quot;{moveState.targetFolder.name ?? 'root'}&quot; folder?
                                <span className="block mt-2 text-sm">
                                    This will move the image file to the selected folder location.
                                </span>
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={moveState.isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant={'default'}
                        className="rounded-md text-sm"
                        onClick={handleMove}
                        disabled={moveState.isLoading}
                    >
                        {moveState.isLoading ? (
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
} 
import { useEditorEngine } from '@/components/store/editor';
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

export const DeleteImageModal = () => {
    const editorEngine = useEditorEngine();
    const { deleteOperations } = useImagesContext();
    const { deleteState, onDeleteImage, handleDeleteModalToggle } = deleteOperations;

    const handleDelete = async () => {
        if (!deleteState.isLoading) {
            await onDeleteImage();
        }
    };

    const handleClose = () => {
        if (!deleteState.isLoading) {
            editorEngine.overlay.clear();
            handleDeleteModalToggle();
        }
    };

    return (
        <AlertDialog open={!!deleteState.imageToDelete} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{'Delete this image?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {"This will delete the image from the project. You can't undo this action."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={deleteState.isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant={'destructive'}
                        className="rounded-md text-sm"
                        onClick={handleDelete}
                        disabled={deleteState.isLoading}
                    >
                        {deleteState.isLoading ? (
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
}

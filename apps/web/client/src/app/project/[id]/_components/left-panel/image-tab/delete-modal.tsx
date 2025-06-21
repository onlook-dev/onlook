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

export default function DeleteImageModal({
    onDelete,
    isOpen,
    toggleOpen,
    isLoading = false,
}: {
    onDelete: () => void;
    isOpen: boolean;
    toggleOpen: () => void;
    isLoading?: boolean;
}) {
    const editorEngine = useEditorEngine();

    const handleDelete = () => {
        if (!isLoading) {
            onDelete();
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            // Reset pointer-events and editor mode when modal is closed
            // for (const frame of editorEngine.frames.getAll()) {
            //     frame.frame.pointerEvents = 'auto';
            // }
            // editorEngine.mode = EditorMode.DESIGN;
            editorEngine.overlay.clear();
            toggleOpen();
        }
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
                                <Icons.Reload className="w-4 h-4 animate-spin mr-2" />
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
}

import { useEditorEngine } from '@/components/Context';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { EditorMode } from '@/lib/models';

export default function DeleteImageModal({
    onDelete,
    isOpen,
    toggleOpen,
}: {
    onDelete: () => void;
    isOpen: boolean;
    toggleOpen: () => void;
}) {
    const editorEngine = useEditorEngine();

    const handleDelete = () => {
        onDelete();
        toggleOpen();
    };

    const handleClose = () => {
        // Reset pointer-events and editor mode when modal is closed
        for (const webview of editorEngine.webviews.webviews.values()) {
            webview.webview.style.pointerEvents = 'auto';
        }
        editorEngine.mode = EditorMode.DESIGN;
        editorEngine.overlay.clear();
        toggleOpen();
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
                    <Button variant={'ghost'} onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        variant={'destructive'}
                        className="rounded-md text-sm"
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

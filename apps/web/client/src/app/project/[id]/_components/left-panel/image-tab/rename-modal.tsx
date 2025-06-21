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
import { observer } from 'mobx-react-lite';

const RenameImageModal = observer(
    ({
        isOpen,
        toggleOpen,
        onRename,
        newName,
        isLoading = false,
    }: {
        isOpen: boolean;
        toggleOpen: () => void;
        onRename: (newName: string) => void;
        newName: string;
        isLoading?: boolean;
    }) => {
        const handleRename = () => {
            if (!isLoading) {
                onRename(newName);
            }
        };

        const handleClose = () => {
            if (!isLoading) {
                toggleOpen();
            }
        };

        return (
            <AlertDialog open={isOpen} onOpenChange={handleClose}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename Image</AlertDialogTitle>
                        <AlertDialogDescription>
                            {`Rename image to "${newName}"`}
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
    },
);

export default RenameImageModal;

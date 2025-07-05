import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';

export default function DeleteConfirmationModal({
    isOpen,
    isLoading,
    handleWarningClose,
    handleDelete
}: {
    isOpen: boolean;
    isLoading: boolean;
    handleWarningClose: () => void;
    handleDelete: () => void;
}) {

    return (
        <AlertDialog open={isOpen} onOpenChange={handleWarningClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Element</AlertDialogTitle>
                    <AlertDialogDescription>
                        <>
                            Are you sure you want to delete the selected element?
                            <span className="block mt-2 text-sm">
                                This action cannot be undone.
                            </span>
                        </>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleWarningClose}>
                        Cancel
                    </Button>
                    <Button
                        variant={'default'}
                        className="rounded-md text-sm"
                        onClick={handleDelete}
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
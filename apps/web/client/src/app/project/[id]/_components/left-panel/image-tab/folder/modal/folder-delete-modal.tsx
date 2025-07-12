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
import type { FolderNode } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useImagesContext } from '../../providers/images-provider';

export const FolderDeleteModal = observer(() => {
    const { folderOperations } = useImagesContext();
    const { deleteState, handleDeleteModalToggle, onDeleteFolder } = folderOperations;

    const handleDelete = async () => {
        if (!deleteState.isLoading) {
            await onDeleteFolder();
        }
    };

    const handleClose = () => {
        if (!deleteState.isLoading) {
            handleDeleteModalToggle();
        }
    };

    const getTotalItems = (folderNode: FolderNode): number => {
        let total = folderNode.images.length;
        if (folderNode.children) {
            for (const [, child] of folderNode.children) {
                total += getTotalItems(child);
            }
        }
        return total;
    };

    const folder = deleteState.folderToDelete;
    const totalItems = folder ? getTotalItems(folder) : 0;
    const hasSubfolders = (folder?.children?.size ?? 0) > 0;

    return (
        <AlertDialog open={!!deleteState.folderToDelete} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        {folder && (
                            <>
                                Are you sure you want to delete the folder &quot;{folder.name}&quot;?
                                {totalItems > 0 && (
                                    <span className="block mt-2 text-red-600">
                                        This will permanently delete {totalItems} item{totalItems !== 1 ? 's' : ''} 
                                        {hasSubfolders && ' and all subfolders'}.
                                    </span>
                                )}
                                <span className="block mt-2 text-sm">
                                    This action cannot be undone.
                                </span>
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button 
                        variant={'ghost'} 
                        onClick={handleClose} 
                        disabled={deleteState.isLoading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant={'destructive'} 
                        onClick={handleDelete} 
                        disabled={deleteState.isLoading}
                    >
                        {deleteState.isLoading ? (
                            <>
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                Deleting
                            </>
                        ) : (
                            'Delete Folder'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
});
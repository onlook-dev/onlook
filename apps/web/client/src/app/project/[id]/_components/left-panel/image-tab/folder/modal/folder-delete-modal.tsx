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
import { useFolderContext } from '../../providers/folder-provider';

export const FolderDeleteModal = observer(() => {
    const { deleteState, handleDeleteModalToggle, onDeleteFolder, getChildFolders, getImagesInFolder } = useFolderContext();

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


    const folder = deleteState.folderToDelete;
    const totalItems = folder ? getImagesInFolder(folder).length : 0;
    const hasSubfolders = folder ? getChildFolders(folder).length > 0 : false;

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
                                        This will permanently delete {totalItems} image{totalItems !== 1 ? 's' : ''} 
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
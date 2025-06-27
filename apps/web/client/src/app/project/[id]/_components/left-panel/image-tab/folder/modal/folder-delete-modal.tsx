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
import type { FolderNode } from '../../providers/types';

export default function FolderDeleteModal({
    onDelete,
    isOpen,
    toggleOpen,
    isLoading = false,
    folder,
}: {
    onDelete: () => void;
    isOpen: boolean;
    toggleOpen: () => void;
    isLoading?: boolean;
    folder: FolderNode | null;
}) {
    const handleDelete = () => {
        if (!isLoading) {
            onDelete();
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            toggleOpen();
        }
    };

    const getTotalItems = (folderNode: FolderNode): number => {
        let total = folderNode.images.length;
        for (const [, child] of folderNode.children) {
            total += getTotalItems(child);
        }
        return total;
    };

    const totalItems = folder ? getTotalItems(folder) : 0;
    const hasSubfolders = folder ? folder.children.size > 0 : false;

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        {folder && (
                            <>
                                Are you sure you want to delete the folder "{folder.name}"?
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
                    <Button variant={'ghost'} onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button 
                        variant={'destructive'} 
                        onClick={handleDelete} 
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Icons.Reload className="w-4 h-4 animate-spin mr-2" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Folder'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 
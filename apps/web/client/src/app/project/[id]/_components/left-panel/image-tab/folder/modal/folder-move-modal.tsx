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


export default function FolderMoveModal({
    onMove,
    isOpen,
    toggleOpen,
    isLoading = false,
    folder,
    targetFolder,
}: {
    onMove: () => void;
    isOpen: boolean;
    toggleOpen: () => void;
    isLoading?: boolean;
    folder: FolderNode | null;
    targetFolder: FolderNode | null;
}) {    
    const handleMove = () => {
        if (!isLoading) {
            onMove();
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
                    <AlertDialogTitle>Move Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        {folder && targetFolder && (
                            <>
                                Are you sure you want to move "{folder.name}" to "{targetFolder.name || 'root'}" folder?
                                <span className="block mt-2 text-sm">
                                    This will move the folder to the selected folder location.
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
                        variant={'default'}
                        className="rounded-md text-sm"
                        onClick={handleMove}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Icons.Reload className="w-4 h-4 animate-spin mr-2" />
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
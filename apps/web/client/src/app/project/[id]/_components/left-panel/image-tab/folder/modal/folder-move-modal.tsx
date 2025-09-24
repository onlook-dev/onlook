import { observer } from 'mobx-react-lite';

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

import { useFolderContext } from '../../providers/folder-provider';

export const FolderMoveModal = observer(() => {
    const { moveState, handleMoveModalToggle, onMoveFolder } = useFolderContext();

    const handleMove = async () => {
        if (!moveState.isLoading) {
            await onMoveFolder();
        }
    };

    const handleClose = () => {
        if (!moveState.isLoading) {
            handleMoveModalToggle();
        }
    };

    const folder = moveState.folderToMove;
    const targetFolder = moveState.targetFolder;

    return (
        <AlertDialog
            open={!!(moveState.folderToMove && moveState.targetFolder)}
            onOpenChange={handleClose}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Move Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        {folder && targetFolder && (
                            <>
                                Are you sure you want to move &quot;{folder.name}&quot; to &quot;
                                {targetFolder.name || 'root'}&quot; folder?
                                <span className="mt-2 block text-sm">
                                    This will move the folder to the selected folder location.
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
                                <Icons.Reload className="mr-2 h-4 w-4 animate-spin" />
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
});

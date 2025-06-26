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
import type { ImageContentData } from '@onlook/models';
import type { FolderNode } from './providers/types';

export default function MoveImageModal({
    onMove,
    isOpen,
    toggleOpen,
    isLoading = false,
    image,
    targetFolder,
}: {
    onMove: () => void;
    isOpen: boolean;
    toggleOpen: () => void;
    isLoading?: boolean;
    image: ImageContentData | null;
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
                    <AlertDialogTitle>Move Image</AlertDialogTitle>
                    <AlertDialogDescription>
                        {image && targetFolder && (
                            <>
                                Are you sure you want to move "{image.fileName}" to "{targetFolder.name || 'root'}" folder?
                                <span className="block mt-2 text-sm">
                                    This will move the image file to the selected folder location.
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
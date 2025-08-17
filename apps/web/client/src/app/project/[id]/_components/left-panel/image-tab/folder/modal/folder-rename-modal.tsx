import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { cn } from '@onlook/ui/utils';
import { useFolderContext } from '../../providers/folder-provider';

export const FolderRenameModal = observer(() => {
    const { renameState, handleRenameInputChange, onRenameFolder, handleRenameModalToggle } =
        useFolderContext();

    const [inputValue, setInputValue] = useState(renameState.newFolderName);

    useEffect(() => {
        setInputValue(renameState.newFolderName);
    }, [renameState.newFolderName, renameState.folderToRename]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        handleRenameInputChange(value);
    };

    const handleRename = async () => {
        if (!renameState.isLoading && inputValue.trim()) {
            await onRenameFolder();
        }
    };

    const handleClose = () => {
        if (!renameState.isLoading) {
            handleRenameModalToggle();
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim() && !renameState.isLoading) {
            await handleRename();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    return (
        <AlertDialog open={!!renameState.folderToRename} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rename Folder</AlertDialogTitle>
                    <AlertDialogDescription>Enter a new name for the folder</AlertDialogDescription>
                </AlertDialogHeader>

                <div className="py-4">
                    <Input
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Folder name"
                        className={cn(
                            renameState.error && 'border-red-500 focus-visible:ring-red-500',
                        )}
                        disabled={renameState.isLoading}
                        autoFocus
                    />
                    {renameState.error && (
                        <p className="text-sm text-red-500 mt-2">{renameState.error}</p>
                    )}
                </div>

                <AlertDialogFooter>
                    <Button
                        variant={'ghost'}
                        onClick={handleClose}
                        disabled={renameState.isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={'default'}
                        onClick={handleRename}
                        disabled={renameState.isLoading || !inputValue.trim()}
                    >
                        {renameState.isLoading ? (
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
});
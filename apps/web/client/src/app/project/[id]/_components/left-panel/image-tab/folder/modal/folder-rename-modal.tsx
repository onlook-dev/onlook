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
import { useState } from 'react';
import { cn } from '@onlook/ui/utils';

export const FolderRenameModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    const [inputValue, setInputValue] = useState('Example Folder Renamed');
    const stubFolderToRename = { name: 'Example Folder' };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleRename = async () => {
        if (!isLoading && inputValue.trim()) {
            // Stub rename logic
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setIsOpen(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
            await handleRename();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rename Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter a new name for &quot;{stubFolderToRename.name}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Input
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Folder name"
                        className={cn(
                            "w-full",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={isLoading}
                        autoFocus
                    />
                </div>
                <AlertDialogFooter>
                    <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRename}
                        disabled={isLoading || !inputValue.trim()}
                        className="min-w-[80px]"
                    >
                        {isLoading ? (
                            <>
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin mr-2" />
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
};
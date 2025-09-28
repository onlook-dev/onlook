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

export const FolderCreateModal = () => {
    // Stub state
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading] = useState(false);
    const [inputValue, setInputValue] = useState('New Folder');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleCreate = async () => {
        if (!isLoading && inputValue.trim()) {
            // Stub create logic
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setIsOpen(false);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
            await handleCreate();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Create New Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter a name for the new folder.
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
                        onClick={handleCreate}
                        disabled={isLoading || !inputValue.trim()}
                        className="min-w-[80px]"
                    >
                        {isLoading ? (
                            <>
                                <Icons.LoadingSpinner className="w-4 h-4 animate-spin mr-2" />
                                Creating...
                            </>
                        ) : (
                            'Create'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
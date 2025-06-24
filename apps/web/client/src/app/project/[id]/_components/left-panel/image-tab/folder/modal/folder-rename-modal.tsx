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

const FolderRenameModal = observer(
    ({
        isOpen,
        toggleOpen,
        onRename,
        currentName,
        onNameChange,
        isLoading = false,
        error,
    }: {
        isOpen: boolean;
        toggleOpen: () => void;
        onRename: () => void;
        currentName: string;
        onNameChange: (name: string) => void;
        isLoading?: boolean;
        error?: string | null;
    }) => {
        const [inputValue, setInputValue] = useState(currentName);

        useEffect(() => {
            setInputValue(currentName);
        }, [currentName, isOpen]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);
            onNameChange(value);
        };

        const handleRename = () => {
            if (!isLoading && inputValue.trim()) {
                onRename();
            }
        };

        const handleClose = () => {
            if (!isLoading) {
                toggleOpen();
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
                handleRename();
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
                            Enter a new name for the folder
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="py-4">
                        <Input
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Folder name"
                            className={cn(
                                error && 'border-red-500 focus-visible:ring-red-500'
                            )}
                            disabled={isLoading}
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-500 mt-2">{error}</p>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <Button variant={'ghost'} onClick={handleClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button 
                            variant={'default'} 
                            onClick={handleRename} 
                            disabled={isLoading || !inputValue.trim()}
                        >
                            {isLoading ? (
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
    },
);

export default FolderRenameModal; 
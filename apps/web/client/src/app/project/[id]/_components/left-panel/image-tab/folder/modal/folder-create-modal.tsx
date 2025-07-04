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
import type { FolderNode } from '../../providers/types';

const FolderCreateModal = observer(
    ({
        isOpen,
        toggleOpen,
        onCreate,
        folderName,
        onNameChange,
        isLoading = false,
        error,
        parentFolder,
    }: {
        isOpen: boolean;
        toggleOpen: () => void;
        onCreate: () => void;
        folderName: string;
        onNameChange: (name: string) => void;
        isLoading?: boolean;
        error?: string | null;
        parentFolder?: FolderNode | null;
    }) => {
        const [inputValue, setInputValue] = useState(folderName);

        useEffect(() => {
            setInputValue(folderName);
        }, [folderName, isOpen]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setInputValue(value);
            onNameChange(value);
        };

        const handleCreate = () => {
            if (!isLoading && inputValue.trim()) {
                onCreate();
            }
        };

        const handleClose = () => {
            if (!isLoading) {
                toggleOpen();
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
                handleCreate();
            }
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        const getLocationText = () => {
            if (!parentFolder) {
                return 'in the root directory';
            }
            return `in "${parentFolder.name}"`;
        };

        return (
            <AlertDialog open={isOpen} onOpenChange={handleClose}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create New Folder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter a name for the new folder {getLocationText()}
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
                            onClick={handleCreate} 
                            disabled={isLoading || !inputValue.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Icons.Reload className="w-4 h-4 animate-spin mr-2" />
                                    Creating...
                                </>
                            ) : (
                                'Create Folder'
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    },
);

export default FolderCreateModal; 
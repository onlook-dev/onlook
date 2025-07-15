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

export const FolderCreateModal = observer(() => {
    const { createState, handleCreateFolderInputChange, onCreateFolder, handleCreateModalToggle } = useFolderContext();
    const [inputValue, setInputValue] = useState(createState.newFolderName);

    useEffect(() => {
        setInputValue(createState.newFolderName);
    }, [createState.newFolderName, createState.isCreating]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        handleCreateFolderInputChange(value);
    };

    const handleCreate = async () => {
        if (!createState.isLoading && inputValue.trim()) {
            await onCreateFolder();
        }
    };

    const handleClose = () => {
        if (!createState.isLoading) {
            handleCreateModalToggle();
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim() && !createState.isLoading) {
            await handleCreate();
        }
        if (e.key === 'Escape') {
            handleClose();
        }
    };

    const getLocationText = () => {
        if (!createState.parentFolder) {
            return 'in the root directory';
        }
        return `in "${createState.parentFolder.name}"`;
    };

    return (
        <AlertDialog open={createState.isCreating} onOpenChange={handleClose}>
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
                            createState.error && 'border-red-500 focus-visible:ring-red-500'
                        )}
                        disabled={createState.isLoading}
                        autoFocus
                    />
                    {createState.error && (
                        <p className="text-sm text-red-500 mt-2">{createState.error}</p>
                    )}
                </div>

                <AlertDialogFooter>
                    <Button 
                        variant={'ghost'} 
                        onClick={handleClose} 
                        disabled={createState.isLoading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant={'default'} 
                        onClick={handleCreate} 
                        disabled={createState.isLoading || !inputValue.trim()}
                    >
                        {createState.isLoading ? (
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
}); 
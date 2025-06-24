import { memo } from 'react';
import FolderTab from './folder-tab';
import type { FolderNode } from '../providers/types';
import { useFolder } from '../hooks/use-folder';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

interface FolderListProps {
    items: FolderNode[];
    onSelectFolder: (folder: FolderNode) => void;
    folder: FolderNode | null;
    showCreateButton: boolean;
}

export const FolderList = memo(({ items, onSelectFolder, folder, showCreateButton }: FolderListProps) => {
    const {
        handleCreateFolder,
        handleRenameFolder,
        handleDeleteFolder,
        handleMoveToFolder,
        isOperating,
    } = useFolder();

    return (
        <div className="flex flex-col space-y-1">
            <p className="text-sm text-gray-200 font-medium">Folders</p>
            {items.map((item, index) => (
                <FolderTab
                    key={item.path || index}
                    folder={item}
                    totalItems={item.images.length}
                    onSelect={() => onSelectFolder(item)}
                    handleRenameFolder={() => handleRenameFolder(item)}
                    handleDeleteFolder={() => handleDeleteFolder(item)}
                    handleMoveToFolder={() => handleMoveToFolder(item)}
                    isDisabled={isOperating}
                />
            ))}
            {showCreateButton && (
            <Button
                variant="default"
                size="icon"
                className="h-8 w-8 text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                onClick={() => handleCreateFolder(folder || undefined)}
                disabled={isOperating}
            >
                <Icons.DirectoryPlus className="h-4 w-4" />
                    Create a Folder
                </Button>
            )}
        </div>
    );
});

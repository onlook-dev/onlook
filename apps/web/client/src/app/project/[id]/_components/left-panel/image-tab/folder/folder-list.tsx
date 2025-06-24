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

export const FolderList = memo(
    ({ items, onSelectFolder, folder, showCreateButton }: FolderListProps) => {
        const {
            handleCreateFolder,
            handleRenameFolder,
            handleDeleteFolder,
            handleMoveToFolder,
            isOperating,
        } = useFolder();

        if (!items.length) {
            return null;
        }

        return (
            <div className="flex flex-col gap-2 max-h-[30vh]">
                <p className="text-sm text-gray-200 font-medium">Folders</p>
                <div className="flex flex-col space-y-1 flex-1 overflow-y-auto">
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
                </div>

                {showCreateButton && (
                    <Button
                        variant="default"
                        size="icon"
                        className="p-2.5 w-full h-fit gap-2 bg-gray-800 hover:bg-gray-700 text-white font-normal"
                        onClick={() => handleCreateFolder(folder || undefined)}
                        disabled={isOperating}
                    >
                        <Icons.DirectoryPlus className="h-4 w-4" />
                        Create a Folder
                    </Button>
                )}
            </div>
        );
    },
);

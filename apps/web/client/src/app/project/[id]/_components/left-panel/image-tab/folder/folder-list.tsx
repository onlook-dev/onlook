import { memo } from 'react';
import FolderTab from './folder-tab';
import type { FolderNode } from '../providers/types';
import { useFolder } from '../hooks/use-folder';

interface FolderListProps {
    items: FolderNode[];
    onSelectFolder: (folder: FolderNode) => void;
}

export const FolderList = memo(({ items, onSelectFolder }: FolderListProps) => {
    const {
        handleRenameFolder,
        handleDeleteFolder,
        handleMoveToFolder,
        isOperating,
    } = useFolder();

    if (!items.length) {
        return null;
    }

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
        </div>
    );
});

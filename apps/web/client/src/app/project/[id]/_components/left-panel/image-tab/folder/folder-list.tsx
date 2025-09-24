import { memo } from 'react';

import type { FolderNode } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';

import { useFolderContext } from '../providers/folder-provider';
import FolderTab from './folder-tab';
import { FolderCreateModal } from './modal/folder-create-modal';
import { FolderDeleteModal } from './modal/folder-delete-modal';
import { FolderMoveModal } from './modal/folder-move-modal';
import { FolderRenameModal } from './modal/folder-rename-modal';

interface FolderListProps {
    childFolders: FolderNode[];
    onSelectFolder: (folder: FolderNode) => void;
    folder: FolderNode;
    rootDir: FolderNode;
    showCreateButton: boolean;
}

export const FolderList = memo(
    ({ childFolders, onSelectFolder, folder, showCreateButton, rootDir }: FolderListProps) => {
        const { handleCreateFolder, isOperating, getImagesInFolder } = useFolderContext();

        if (!childFolders.length) {
            return null;
        }

        return (
            <div className="flex max-h-[30vh] flex-col gap-2">
                <p className="text-sm font-medium text-gray-200">Folders</p>
                <div className="flex flex-1 flex-col space-y-1 overflow-y-auto">
                    {childFolders.map((item, index) => (
                        <FolderTab
                            key={item.fullPath || index}
                            folder={item}
                            totalImages={getImagesInFolder(item).length}
                            onSelect={() => onSelectFolder(item)}
                            isDisabled={isOperating}
                            rootDir={rootDir}
                        />
                    ))}
                </div>

                {showCreateButton && (
                    <Button
                        variant="default"
                        size="icon"
                        className="h-fit w-full gap-2 bg-gray-800 p-2.5 font-normal text-white hover:bg-gray-700"
                        onClick={() => handleCreateFolder(folder)}
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

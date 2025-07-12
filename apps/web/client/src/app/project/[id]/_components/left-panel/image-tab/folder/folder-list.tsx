import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { memo } from 'react';
import { useImagesContext } from '../providers/images-provider';
import FolderTab from './folder-tab';
import { FolderDeleteModal } from './modal/folder-delete-modal';
import { FolderMoveModal } from './modal/folder-move-modal';
import { FolderRenameModal } from './modal/folder-rename-modal';
import type { FolderNode } from '@onlook/models';

interface FolderListProps {
    childFolders: FolderNode[];
    onSelectFolder: (folder: FolderNode) => void;
    folder: FolderNode;
    showCreateButton: boolean;
}

export const FolderList = memo(
    ({ childFolders, onSelectFolder, folder, showCreateButton }: FolderListProps) => {
        const { folderOperations } = useImagesContext();
        const { handleCreateFolder, isOperating } = folderOperations;

        if (!childFolders.length) {
            return null;
        }

        return (
            <div className="flex flex-col gap-2 max-h-[30vh]">
                <p className="text-sm text-gray-200 font-medium">Folders</p>
                <div className="flex flex-col space-y-1 flex-1 overflow-y-auto">
                    {childFolders.map((item, index) => (
                        <FolderTab
                            key={item.fullPath || index}
                            folder={item}
                            totalItems={item.images.length}
                            onSelect={() => onSelectFolder(item)}
                            isDisabled={isOperating}
                        />
                    ))}
                </div>

                {showCreateButton && (
                    <Button
                        variant="default"
                        size="icon"
                        className="p-2.5 w-full h-fit gap-2 bg-gray-800 hover:bg-gray-700 text-white font-normal"
                        onClick={() => handleCreateFolder(folder)}
                        disabled={isOperating}
                    >
                        <Icons.DirectoryPlus className="h-4 w-4" />
                        Create a Folder
                    </Button>
                )}

                {/* Folder Operation Modals */}
                <FolderRenameModal />
                <FolderDeleteModal />
                <FolderMoveModal />
            </div>
        );
    },
);
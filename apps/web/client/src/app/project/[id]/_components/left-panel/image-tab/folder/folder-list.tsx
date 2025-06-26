import { memo } from 'react';
import FolderTab from './folder-tab';
import type { FolderNode } from '../providers/types';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import FolderDeleteModal from './modal/folder-delete-modal';
import FolderRenameModal from './modal/folder-rename-modal';
import { useImagesContext } from '../providers/images-provider';
import FolderMoveModal from './modal/folder-move-modal';

interface FolderListProps {
    items: FolderNode[];
    onSelectFolder: (folder: FolderNode) => void;
    folder: FolderNode | null;
    showCreateButton: boolean;
}

export const FolderList = memo(
    ({ items, onSelectFolder, folder, showCreateButton }: FolderListProps) => {
        const { folderOperations } = useImagesContext();
        const {
            renameState,
            deleteState,
            moveState,
            handleRenameInputChange,
            onRenameFolder,
            handleRenameModalToggle,
            onDeleteFolder,
            handleDeleteModalToggle,
            handleCreateFolder,
            isOperating,
            handleMoveModalToggle,
            onMoveFolder,
        } = folderOperations;

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

                {/* Folder Operation Modals */}
                <FolderRenameModal
                    isOpen={!!renameState.folderToRename}
                    toggleOpen={handleRenameModalToggle}
                    onRename={onRenameFolder}
                    currentName={renameState.newFolderName}
                    onNameChange={handleRenameInputChange}
                    isLoading={renameState.isLoading}
                    error={renameState.error}
                />

                <FolderDeleteModal
                    isOpen={!!deleteState.folderToDelete}
                    toggleOpen={handleDeleteModalToggle}
                    onDelete={onDeleteFolder}
                    isLoading={deleteState.isLoading}
                    folder={deleteState.folderToDelete}
                />
                <FolderMoveModal
                    isOpen={!!moveState.folderToMove && !!moveState.targetFolder}
                    toggleOpen={handleMoveModalToggle}
                    onMove={onMoveFolder}
                    isLoading={moveState.isLoading}
                    folder={moveState.folderToMove}
                    targetFolder={moveState.targetFolder}
                />
            </div>
        );
    },
);

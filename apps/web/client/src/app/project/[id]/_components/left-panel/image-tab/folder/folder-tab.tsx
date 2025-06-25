import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { FolderDropdownMenu } from './folder-dropdown-menu';
import type { FolderNode } from '../providers/types';
import { useImagesContext } from '../providers/images-provider';

interface FolderTabProps {
    folder: FolderNode;
    totalItems: number;
    onSelect: () => void;
    isDisabled: boolean;
}

export default function FolderTab({
    folder,
    totalItems,
    onSelect,
    isDisabled
}: FolderTabProps) {

    const { folderStructure, folderOperations } = useImagesContext();  
    const { moveState, handleRenameFolder, handleDeleteFolder, handleMoveToFolder } = folderOperations;
    return (
        <div 
            onClick={onSelect} 
            className={cn(
                'flex items-center gap-2 hover:bg-gray-800 hover:rounded-md p-1 relative group cursor-pointer',
                isDisabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <div className="p-2 bg-gray-700 rounded-md">
                <Icons.DirectoryOpen className="w-4 h-4" />
            </div>
            <div className="flex flex-col flex-1">
                <p className="text-sm text-gray-200">{folder.name}</p>
                <span className="text-xs text-gray-200">{totalItems} items</span>
            </div>
            
            <FolderDropdownMenu
                folder={folder}
                handleRenameFolder={() => handleRenameFolder(folder)}
                handleDeleteFolder={() => handleDeleteFolder(folder)}
                handleMoveToFolder={handleMoveToFolder}
                isDisabled={isDisabled}
                folderStructure={folderStructure}
                selectedTargetFolder={moveState.targetFolder}
            />
        </div>
    );
}

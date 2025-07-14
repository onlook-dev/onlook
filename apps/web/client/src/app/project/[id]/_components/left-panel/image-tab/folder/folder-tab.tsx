import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { FolderDropdownMenu } from './folder-dropdown-menu';
import type { FolderNode } from '@onlook/models';

interface FolderTabProps {
    folder: FolderNode;
    totalImages: number;
    onSelect: () => void;
    isDisabled: boolean;
    rootDir: FolderNode;
}

export default function FolderTab({
    folder,
    totalImages,
    onSelect,
    isDisabled,
    rootDir
}: FolderTabProps) {

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
                <span className="text-xs text-gray-200">{totalImages} image{totalImages !== 1 ? 's' : ''}</span>
            </div>
            
            <FolderDropdownMenu
                rootDir={rootDir}
                folder={folder}
                isDisabled={isDisabled}
            />
        </div>
    );
}

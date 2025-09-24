import type { FolderNode } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { FolderDropdownMenu } from './folder-dropdown-menu';

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
    rootDir,
}: FolderTabProps) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                'group relative flex cursor-pointer items-center gap-2 p-1 hover:rounded-md hover:bg-gray-800',
                isDisabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <div className="rounded-md bg-gray-700 p-2">
                <Icons.DirectoryOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-1 flex-col">
                <p className="text-sm text-gray-200">{folder.name}</p>
                <span className="text-xs text-gray-200">
                    {totalImages} image{totalImages !== 1 ? 's' : ''}
                </span>
            </div>

            <FolderDropdownMenu rootDir={rootDir} folder={folder} isDisabled={isDisabled} />
        </div>
    );
}

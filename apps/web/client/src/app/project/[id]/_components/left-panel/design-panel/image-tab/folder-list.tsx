'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import type { FolderData } from './types';

interface FolderListProps {
    folders: FolderData[];
    onFolderClick: (folder: FolderData) => void;
}

export const FolderList = ({ folders, onFolderClick }: FolderListProps) => {
    if (folders.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-foreground-secondary">
                Folders
            </div>
            <div className="flex flex-wrap gap-1">
                {folders.map((folder) => (
                    <Button
                        key={folder.path}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onFolderClick(folder)}
                    >
                        <Icons.File className="w-3 h-3 mr-1" />
                        {folder.name}
                    </Button>
                ))}
            </div>
        </div>
    );
};
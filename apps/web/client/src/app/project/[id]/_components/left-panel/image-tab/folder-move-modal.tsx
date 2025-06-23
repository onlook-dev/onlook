import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { ScrollArea } from '@onlook/ui/scroll-area';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import type { FolderNode } from './providers/types';

interface FolderTreeItemProps {
    folder: FolderNode;
    level: number;
    selectedFolder: FolderNode | null;
    onSelectFolder: (folder: FolderNode) => void;
    folderToMove: FolderNode;
}

const FolderTreeItem = ({ 
    folder, 
    level, 
    selectedFolder, 
    onSelectFolder, 
    folderToMove 
}: FolderTreeItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = folder.children.size > 0;
    
    const isDisabled = folder.fullPath === folderToMove.fullPath || 
                      folder.fullPath.startsWith(`${folderToMove.fullPath}/`);
    
    const isSelected = selectedFolder?.fullPath === folder.fullPath;

    const handleClick = () => {
        if (!isDisabled) {
            onSelectFolder(folder);
        }
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div>
            <div
                className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
                    isSelected && 'bg-blue-100 dark:bg-blue-900',
                    isDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={handleClick}
            >
                {hasChildren && (
                    <button
                        onClick={handleToggle}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                        {isExpanded ? (
                            <Icons.ChevronDown className="w-3 h-3" />
                        ) : (
                            <Icons.ChevronRight className="w-3 h-3" />
                        )}
                    </button>
                )}
                {!hasChildren && <div className="w-5" />}
                
                <Icons.Directory className="w-4 h-4 text-blue-600" />
                <span className="text-sm">{folder.name}</span>
                {folder.images.length > 0 && (
                    <span className="text-xs text-gray-500 ml-auto">
                        {folder.images.length} items
                    </span>
                )}
            </div>
            
            {isExpanded && hasChildren && (
                <div>
                    {Array.from(folder.children.values()).map((child) => (
                        <FolderTreeItem
                            key={child.fullPath}
                            folder={child}
                            level={level + 1}
                            selectedFolder={selectedFolder}
                            onSelectFolder={onSelectFolder}
                            folderToMove={folderToMove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function FolderMoveModal({
    onMove,
    isOpen,
    toggleOpen,
    isLoading = false,
    folderToMove,
    rootFolder,
    selectedTargetFolder,
    onSelectTargetFolder,
    error,
}: {
    onMove: () => void;
    isOpen: boolean;
    toggleOpen: () => void;
    isLoading?: boolean;
    folderToMove: FolderNode | null;
    rootFolder: FolderNode;
    selectedTargetFolder: FolderNode | null;
    onSelectTargetFolder: (folder: FolderNode) => void;
    error?: string | null;
}) {
    const handleMove = () => {
        if (!isLoading && selectedTargetFolder) {
            onMove();
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            toggleOpen();
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Move Folder</AlertDialogTitle>
                    <AlertDialogDescription>
                        {folderToMove && (
                            <>
                                Select a destination folder for "{folderToMove.name}"
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="py-4">
                    <ScrollArea className="h-64 border rounded-md p-2">
                        {folderToMove && (
                            <FolderTreeItem
                                folder={rootFolder}
                                level={0}
                                selectedFolder={selectedTargetFolder}
                                onSelectFolder={onSelectTargetFolder}
                                folderToMove={folderToMove}
                            />
                        )}
                    </ScrollArea>
                    
                    {error && (
                        <p className="text-sm text-red-500 mt-2">{error}</p>
                    )}
                    
                    {selectedTargetFolder && (
                        <p className="text-sm text-gray-600 mt-2">
                            Moving to: {selectedTargetFolder.fullPath || 'Root'}
                        </p>
                    )}
                </div>

                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={handleClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button 
                        variant={'default'} 
                        onClick={handleMove} 
                        disabled={isLoading || !selectedTargetFolder}
                    >
                        {isLoading ? (
                            <>
                                <Icons.Reload className="w-4 h-4 animate-spin mr-2" />
                                Moving...
                            </>
                        ) : (
                            'Move Folder'
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 
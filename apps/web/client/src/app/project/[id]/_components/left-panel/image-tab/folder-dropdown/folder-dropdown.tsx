import { Icons } from '@onlook/ui/icons';
import { ScrollArea } from '@onlook/ui/scroll-area';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import type { FolderNode } from '@onlook/models';
import { useFolderContext } from '../providers/folder-provider';

interface FolderTreeItemProps {
    folder: FolderNode;
    level: number;
    selectedFolder: FolderNode | null;
    onSelectFolder: (folder: FolderNode) => void;
    onClose?: () => void;
    asMenuContent?: boolean;
}

const FolderTreeItem = ({
    folder,
    level,
    selectedFolder,
    onSelectFolder,
    onClose,
    asMenuContent = false,
}: FolderTreeItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { getChildFolders } = useFolderContext();
    const children = getChildFolders(folder);

    const isSelected = selectedFolder?.fullPath === folder.fullPath;

    const handleClick = () => {
        onSelectFolder(folder);
        if (onClose) {
            onClose();
        }
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (children.length > 0) {
            setIsExpanded(!isExpanded);
        }
    };

    const baseClassName = asMenuContent
        ? 'flex items-center gap-2 p-2 rounded-sm cursor-pointer hover:bg-background-secondary text-smallPlus'
        : 'flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-background-secondary';

    return (
        <div>
            <div
                className={cn(baseClassName, isSelected && 'bg-background-active')}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={handleClick}
            >
                {children.length > 0 && (
                    <button
                        onClick={handleToggle}
                        className="p-1 hover:bg-background-secondary rounded"
                        type="button"
                    >
                        {isExpanded ? (
                            <Icons.ChevronDown className="w-3 h-3" />
                        ) : (
                            <Icons.ChevronRight className="w-3 h-3" />
                        )}
                    </button>
                )}
                {children.length === 0 && <div className="w-5" />}

                <Icons.Directory className="w-4 h-4 text-foreground-secondary" />
                <span className={cn('text-sm', asMenuContent && 'text-smallPlus')}>
                    {folder.name}
                </span>
            </div>

            {isExpanded && children.length > 0 && (
                <div>
                    {children.map((child) => (
                        <FolderTreeItem
                            key={child.fullPath}
                            folder={child}
                            level={level + 1}
                            selectedFolder={selectedFolder}
                            onSelectFolder={onSelectFolder}
                            onClose={onClose}
                            asMenuContent={asMenuContent}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface FolderDropdownProps {
    rootFolder: FolderNode;
    selectedFolder: FolderNode | null;
    onSelectFolder: (folder: FolderNode) => void;
}

export const FolderDropdown = ({
    rootFolder,
    selectedFolder,
    onSelectFolder,
}: FolderDropdownProps) => {
    const handleSelect = (folder: FolderNode) => {
        onSelectFolder(folder);
    };

    return (
        <ScrollArea className="h-48 p-2">
            <FolderTreeItem
                folder={rootFolder}
                level={0}
                selectedFolder={selectedFolder}
                onSelectFolder={handleSelect}
                asMenuContent={true}
            />
        </ScrollArea>
    );
};

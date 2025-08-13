import { DropdownMenu } from '@onlook/ui/dropdown-menu';

import { Button } from '@onlook/ui/button';
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { memo, useCallback, useMemo, useState } from 'react';
import { FolderDropdown } from '../folder-dropdown/folder-dropdown';
import type { FolderNode } from '@onlook/models';
import { useFolderContext } from '../providers/folder-provider';

export const FolderDropdownMenu = memo(
    ({
        folder,
        rootDir,
        isDisabled,
        alwaysVisible,
        className,
    }: {
        folder: FolderNode;
        rootDir: FolderNode;
        isDisabled?: boolean;
        alwaysVisible?: boolean;
        className?: string;
    }) => {
        const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

        const { handleRenameFolder, handleDeleteFolder, handleMoveToFolder, moveState } = useFolderContext();

        const handleOpenChange = useCallback(
            (isOpen: boolean) => {
                if (!isDisabled) {
                    setActiveDropdown(isOpen ? (folder.name ?? null) : null);
                }
            },
            [folder.name, isDisabled],
        );

        const handleFolderSelect = useCallback(
            (targetFolder: FolderNode) => {
                handleMoveToFolder(folder, targetFolder);
            },
            [handleMoveToFolder, folder],
        );

        const isVisible = useMemo(() => {
            return alwaysVisible ? true : activeDropdown === folder.name;
        }, [activeDropdown, folder.name, alwaysVisible]);

        return (
            <div
                className={cn(
                    'group-hover:opacity-100 transition-opacity duration-300',
                    isVisible ? 'opacity-100' : 'opacity-0',
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <DropdownMenu onOpenChange={handleOpenChange}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant={'ghost'}
                            className={cn(
                                'bg-background p-1 inline-flex items-center justify-center h-auto w-auto rounded shadow-sm',
                                className,
                            )}
                            disabled={isDisabled}
                        >
                            <Icons.DotsHorizontal className="text-foreground dark:text-white w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="rounded-md bg-background"
                        align="start"
                        side="right"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenuItem asChild>
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRenameFolder(folder);
                                }}
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                disabled={isDisabled}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.Pencil className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Rename</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Button
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder);
                                }}
                                disabled={isDisabled}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Delete</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        {rootDir && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger
                                        disabled={isDisabled}
                                        className="hover:bg-background-secondary focus:bg-background-secondary rounded-sm"
                                    >
                                        <span className="flex w-full text-smallPlus items-center">
                                            <Icons.MoveToFolder className="mr-2 h-4 w-4 text-foreground-secondary" />
                                            <span>Move to Folder</span>
                                        </span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-64 p-0" sideOffset={8}>
                                        <FolderDropdown
                                            rootFolder={rootDir}
                                            selectedFolder={moveState.targetFolder}
                                            onSelectFolder={handleFolderSelect}
                                        />
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    },
);
import { DropdownMenu } from '@onlook/ui/dropdown-menu';

import { memo, useCallback, useMemo, useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import type { FolderNode } from '../providers/types';

export const FolderDropdownMenu = memo(
    ({
        folder,
        handleRenameFolder,
        handleDeleteFolder,
        handleMoveToFolder,
        isDisabled,
    }: {
        folder: FolderNode;
        handleRenameFolder: () => void;
        handleDeleteFolder: () => void;
        handleMoveToFolder: () => void;
        isDisabled: boolean;
    }) => {
        const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

        const handleOpenChange = useCallback(
            (isOpen: boolean) => {
                if (!isDisabled) {
                    setActiveDropdown(isOpen ? folder.name : null);
                }
            },
            [folder.name, isDisabled],
        );

        const isVisible = useMemo(() => {
            return activeDropdown === folder.name;
        }, [activeDropdown, folder.name]);

        return (
            <div
                className={`absolute right-2 top-2 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                } group-hover:opacity-100 transition-opacity duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                <DropdownMenu onOpenChange={handleOpenChange}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant={'ghost'}
                            className="bg-background p-1 inline-flex items-center justify-center h-auto w-auto rounded shadow-sm"
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
                                    handleRenameFolder();
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
                                    handleMoveToFolder();
                                }}
                                disabled={isDisabled}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.MoveToFolder className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Move to Folder</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Button
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder();
                                }}
                                disabled={isDisabled}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Delete</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    },
);

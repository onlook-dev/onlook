import { memo, useCallback, useMemo, useState } from 'react';

import type { FolderNode, ImageContentData } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { rootDir } from './folder';
import { FolderDropdown } from './folder-dropdown/folder-dropdown';

export const ImageDropdownMenu = memo(
    ({
        image,
        handleRenameImage,
        handleDeleteImage,
        handleOpenFolder,
        handleMoveToFolder,
        isDisabled,
        selectedTargetFolder,
        onSelectTargetFolder,
    }: {
        image: ImageContentData;
        handleRenameImage: () => void;
        handleDeleteImage: () => void;
        handleOpenFolder: () => void;
        handleMoveToFolder: (targetFolder: FolderNode) => void;
        isDisabled: boolean;
        selectedTargetFolder: FolderNode | null;
        onSelectTargetFolder: (folder: FolderNode) => void;
    }) => {
        const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

        const handleOpenChange = useCallback(
            (isOpen: boolean) => {
                if (!isDisabled) {
                    setActiveDropdown(isOpen ? image.fileName : null);
                }
            },
            [image.fileName, isDisabled],
        );

        const handleFolderSelect = useCallback(
            (folder: FolderNode) => {
                onSelectTargetFolder(folder);
                handleMoveToFolder(folder);
            },
            [onSelectTargetFolder, handleMoveToFolder],
        );

        const isVisible = useMemo(() => {
            return activeDropdown === image.fileName;
        }, [activeDropdown, image.fileName]);

        return (
            <div
                className={`absolute top-2 right-2 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                } transition-opacity duration-300 group-hover:opacity-100`}
            >
                <DropdownMenu onOpenChange={handleOpenChange}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant={'ghost'}
                            className="bg-background inline-flex h-auto w-auto items-center justify-center rounded p-1 shadow-sm"
                            disabled={isDisabled}
                        >
                            <Icons.DotsHorizontal className="text-foreground h-4 w-4 dark:text-white" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="bg-background rounded-md"
                        align="start"
                        side="right"
                    >
                        <DropdownMenuItem asChild>
                            <Button
                                onClick={handleRenameImage}
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary group w-full rounded-sm"
                                disabled={isDisabled}
                            >
                                <span className="text-smallPlus flex w-full items-center">
                                    <Icons.Pencil className="text-foreground-secondary group-hover:text-foreground-active mr-2 h-4 w-4" />
                                    <span>Rename</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Button
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary group w-full rounded-sm"
                                onClick={handleDeleteImage}
                                disabled={isDisabled}
                            >
                                <span className="text-smallPlus flex w-full items-center">
                                    <Icons.Trash className="text-foreground-secondary group-hover:text-foreground-active mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Button
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary group w-full rounded-sm"
                                onClick={handleOpenFolder}
                                disabled={isDisabled}
                            >
                                <span className="text-smallPlus flex w-full items-center">
                                    <Icons.DirectoryOpen className="text-foreground-secondary group-hover:text-foreground-active mr-2 h-4 w-4" />
                                    <span>Open Folder</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger
                                disabled={isDisabled}
                                className="hover:bg-background-secondary focus:bg-background-secondary rounded-sm"
                            >
                                <span className="text-smallPlus flex w-full items-center">
                                    <Icons.MoveToFolder className="text-foreground-secondary mr-2 h-4 w-4" />
                                    <span>Move to Folder</span>
                                </span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-64 p-0" sideOffset={8}>
                                <FolderDropdown
                                    rootFolder={rootDir}
                                    selectedFolder={selectedTargetFolder}
                                    onSelectFolder={handleFolderSelect}
                                />
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    },
);

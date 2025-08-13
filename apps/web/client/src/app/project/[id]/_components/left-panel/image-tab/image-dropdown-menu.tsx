import type { FolderNode, ImageContentData } from "@onlook/models";
import { Button } from "@onlook/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { memo, useCallback, useMemo, useState } from "react";
import { rootDir } from "./folder";
import { FolderDropdown } from "./folder-dropdown/folder-dropdown";

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
                className={`absolute right-2 top-2 ${isVisible ? 'opacity-100' : 'opacity-0'
                    } group-hover:opacity-100 transition-opacity duration-300`}
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
                    >
                        <DropdownMenuItem asChild>
                            <Button
                                onClick={handleRenameImage}
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
                                onClick={handleDeleteImage}
                                disabled={isDisabled}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Delete</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Button
                                variant={'ghost'}
                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                onClick={handleOpenFolder}
                                disabled={isDisabled}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.DirectoryOpen className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
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
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.MoveToFolder className="mr-2 h-4 w-4 text-foreground-secondary" />
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
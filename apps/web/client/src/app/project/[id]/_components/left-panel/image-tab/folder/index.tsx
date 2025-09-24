'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import type { FolderNode } from '@onlook/models';
import { DefaultSettings } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';

import { useEditorEngine } from '@/components/store/editor';
import { DeleteImageModal } from '../delete-modal';
import { useFolderImages } from '../hooks/use-folder-images';
import { useImageSearch } from '../hooks/use-image-search';
import { ImageList } from '../image-list';
import { MoveImageModal } from '../move-modal';
import { useFolderContext } from '../providers/folder-provider';
import { useImagesContext } from '../providers/images-provider';
import { RenameImageModal } from '../rename-modal';
import { FolderDropdownMenu } from './folder-dropdown-menu';
import { FolderList } from './folder-list';
import { FolderCreateModal } from './modal/folder-create-modal';
import { FolderDeleteModal } from './modal/folder-delete-modal';
import { FolderMoveModal } from './modal/folder-move-modal';
import { FolderRenameModal } from './modal/folder-rename-modal';

interface FolderPathItem {
    folder: FolderNode;
    name: string;
}

export const rootDir: FolderNode = {
    name: DefaultSettings.IMAGE_FOLDER,
    fullPath: DefaultSettings.IMAGE_FOLDER,
};

const Folder = observer(() => {
    const inputRef = useRef<HTMLInputElement>(null);
    const breadcrumbsRef = useRef<HTMLDivElement>(null);
    const editorEngine = useEditorEngine();

    const { uploadOperations, isOperating } = useImagesContext();
    const [currentFolder, setCurrentFolder] = useState<FolderNode>(rootDir);
    const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);
    const [childFolders, setChildFolders] = useState<FolderNode[]>([]);

    const folders = useMemo(
        () =>
            editorEngine.activeSandbox.directories.filter((dir) =>
                dir.startsWith(rootDir.fullPath),
            ),
        [editorEngine.activeSandbox.directories, rootDir.fullPath],
    );

    const { folderImagesState } = useFolderImages(currentFolder);

    const { search, filteredImages, handleSearchClear, handleSearchChange, handleKeyDown } =
        useImageSearch({
            imageAssets: folderImagesState.images,
        });

    const {
        handleCreateFolder,
        isOperating: isFolderOperating,
        getChildFolders,
    } = useFolderContext();

    const handleSelectFolder = async (folder: FolderNode) => {
        if (currentFolder) {
            setFolderPath((prev) => [...prev, { folder: currentFolder, name: currentFolder.name }]);
        }
        setCurrentFolder(folder);
    };

    const handleGoBack = () => {
        if (folderPath.length > 0) {
            const previousFolder = folderPath[folderPath.length - 1];
            if (previousFolder) {
                setCurrentFolder(previousFolder.folder);
                setFolderPath((prev) => prev.slice(0, -1));
            }
        } else {
            setCurrentFolder(rootDir);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setCurrentFolder(rootDir);
            setFolderPath([]);
        } else {
            const targetFolder = folderPath[index];
            if (targetFolder) {
                setCurrentFolder(targetFolder.folder);
                setFolderPath((prev) => prev.slice(0, index));
            }
        }
    };

    const loadDirData = async (folder: FolderNode) => {
        const childFolders = getChildFolders(folder);
        setChildFolders(childFolders);
    };

    useEffect(() => {
        if (currentFolder && folders.length > 0) {
            loadDirData(currentFolder);
        }
    }, [currentFolder, folders]);

    // Auto-scroll breadcrumbs to the right when folder path changes
    useEffect(() => {
        if (breadcrumbsRef.current) {
            breadcrumbsRef.current.scrollLeft = breadcrumbsRef.current.scrollWidth;
        }
    }, [folderPath]);

    const handleKeyDownWithRef = (e: React.KeyboardEvent) => {
        handleKeyDown(e);
        if (e.key === 'Escape') {
            inputRef.current?.blur();
        }
    };

    const canGoBack = folderPath.length > 0 || currentFolder !== rootDir;
    const isAnyOperationLoading = isOperating || isFolderOperating;

    const showCreateButton = !!currentFolder && currentFolder === rootDir;

    return (
        <div className="flex h-full flex-col gap-2">
            {/* Navigation Header */}
            {canGoBack && (
                <>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleGoBack}
                            disabled={!canGoBack}
                            className="relative z-10 h-8 w-8"
                        >
                            <Icons.ArrowLeft className="h-4 w-4" />
                        </Button>

                        {/* Breadcrumbs Container with Fade Gradient */}
                        <div className="relative min-w-0 flex-1">
                            {/* Fade Gradient Overlay */}
                            <div className="from-background-primary pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-8 bg-gradient-to-r to-transparent" />

                            {/* Breadcrumbs */}
                            <div
                                ref={breadcrumbsRef}
                                className="scrollbar-hide flex items-center gap-1 overflow-x-auto scroll-smooth text-sm text-gray-200"
                            >
                                {folderPath.map((pathItem, index) => (
                                    <div key={index} className="flex items-center gap-1">
                                        <Icons.ChevronRight className="h-3 w-3 text-gray-400" />
                                        <button
                                            onClick={() => handleBreadcrumbClick(index)}
                                            className="whitespace-nowrap transition-colors hover:text-white"
                                        >
                                            {pathItem.name}
                                        </button>
                                    </div>
                                ))}

                                {currentFolder && currentFolder !== rootDir && (
                                    <div className="flex items-center gap-1">
                                        <Icons.ChevronRight className="h-3 w-3 text-gray-400" />
                                        <span className="font-medium whitespace-nowrap text-white">
                                            {currentFolder.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {currentFolder && (
                            <FolderDropdownMenu
                                rootDir={rootDir}
                                folder={currentFolder}
                                className="bg-gray-700"
                                alwaysVisible={true}
                            />
                        )}
                    </div>
                    <Separator />
                </>
            )}
            <div className="m-0 flex flex-row items-center gap-2">
                <div className="relative min-w-0 flex-1">
                    <Input
                        ref={inputRef}
                        className="h-8 w-full pr-8 text-xs"
                        placeholder="Search images"
                        value={search}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDownWithRef}
                        disabled={isAnyOperationLoading}
                    />

                    {search && (
                        <button
                            className="hover:bg-background-onlook group absolute top-[1px] right-[1px] bottom-[1px] flex aspect-square items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] active:bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={handleSearchClear}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.CrossS className="text-foreground-primary/50 group-hover:text-foreground-primary h-3 w-3" />
                        </button>
                    )}
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook h-fit w-fit border p-2"
                            onClick={() => handleCreateFolder(currentFolder)}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.DirectoryPlus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Create a folder</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook h-fit w-fit border p-2"
                            onClick={() => editorEngine.image.scanImages()}
                        >
                            <Icons.Reload className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Refresh Images</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook h-fit w-fit border p-2"
                            onClick={uploadOperations.handleClickAddButton}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.Plus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Upload an image</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
            </div>

            {/* Folder Content */}
            <FolderList
                childFolders={childFolders}
                folder={currentFolder}
                showCreateButton={showCreateButton}
                onSelectFolder={handleSelectFolder}
                rootDir={rootDir}
            />

            {/* Images Section */}
            {folderImagesState.isLoading ? (
                <div className="text-foreground-primary/50 flex h-32 items-center justify-center text-xs">
                    <div className="flex items-center gap-2">
                        <Icons.Reload className="h-4 w-4 animate-spin" />
                        Loading images...
                    </div>
                </div>
            ) : (
                <ImageList images={filteredImages} currentFolder={currentFolder.fullPath} />
            )}
            {/* Image Operation Modals */}
            <DeleteImageModal />
            <RenameImageModal />
            <MoveImageModal />

            {/* Folder Operation Modals */}
            <FolderRenameModal />
            <FolderDeleteModal />
            <FolderMoveModal />
            <FolderCreateModal />
        </div>
    );
});

export default Folder;

import { useEditorEngine } from '@/components/store/editor';
import { sendAnalytics } from '@/utils/analytics';
import { EditorMode, EditorTabValue, type ImageContentData } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeleteImageModal from './delete-modal';
import RenameImageModal from './rename-modal';

interface UploadState {
    isUploading: boolean;
    error: string | null;
}

interface RenameState {
    imageToRename: string | null;
    originImagePath: string | null;
    newImageName: string;
    error: string | null;
    isLoading: boolean;
}

interface DeleteState {
    imageToDelete: string | null;
    isLoading: boolean;
}

export const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();

    const [search, setSearch] = useState('');
    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        error: null,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [deleteState, setDeleteState] = useState<DeleteState>({
        imageToDelete: null,
        isLoading: false,
    });
    const [renameState, setRenameState] = useState<RenameState>({
        imageToRename: null,
        originImagePath: null,
        newImageName: '',
        error: null,
        isLoading: false,
    });
    const inputRef = useRef<HTMLInputElement>(null);

    const imageAssets = useMemo(() => {
        return editorEngine.image.assets;
    }, [editorEngine.image.assets]);

    const filteredImages = useMemo(() => {
        if (!search.trim()) {
            return imageAssets;
        }
        const searchLower = search.toLowerCase();
        return imageAssets.filter((image) => image.fileName?.toLowerCase()?.includes(searchLower));
    }, [search, imageAssets]);

    const uploadImage = useCallback(
        async (file: File) => {
            setUploadState({ isUploading: true, error: null });

            if (!file.type.startsWith('image/')) {
                setUploadState({ isUploading: false, error: 'Please select a valid image file' });
                return;
            }
            try {
                await editorEngine.image.upload(file);
                setUploadState({ isUploading: false, error: null });
            } catch (error) {
                setUploadState({
                    isUploading: false,
                    error: 'Failed to upload image. Please try again.',
                });
                console.error('Image upload error:', error);
            }
        },
        [editorEngine.image],
    );

    const handleUploadFile = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files ?? []);
            const imageFiles = files.filter((file) => file.type.startsWith('image/'));

            for (const imageFile of imageFiles) {
                await uploadImage(imageFile);
            }
        },
        [uploadImage],
    );

    const handleClickAddButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur(); // Removes focus from the button to prevent tooltip from showing
        const input = document.getElementById('images-upload');
        if (input) {
            input.click();
        }
    }, []);

    const handleDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();

            setIsDragging(false);
            e.currentTarget.removeAttribute('data-dragging-image');

            const items = Array.from(e.dataTransfer.items);
            const imageFiles = items
                .filter((item) => item.type.startsWith('image/'))
                .map((item) => item.getAsFile())
                .filter((file): file is File => file !== null);

            for (const file of imageFiles) {
                await uploadImage(file);
            }
        },
        [uploadImage],
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleDragStateChange(true, e);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            handleDragStateChange(false, e);
        }
    }, []);

    const handleDragStateChange = useCallback(
        (isDragging: boolean, e: React.DragEvent<HTMLDivElement>) => {
            const hasImage =
                e.dataTransfer.types.length > 0 &&
                Array.from(e.dataTransfer.items).some(
                    (item) =>
                        item.type.startsWith('image/') ||
                        (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
                );
            if (hasImage) {
                setIsDragging(isDragging);
                e.currentTarget.setAttribute('data-dragging-image', isDragging.toString());
            }
        },
        [],
    );

    const handleDeleteImage = useCallback((image: ImageContentData) => {
        setDeleteState({
            imageToDelete: image.originPath,
            isLoading: false,
        });
    }, []);

    const onDeleteImage = useCallback(async () => {
        if (deleteState.imageToDelete) {
            setDeleteState((prev) => ({ ...prev, isLoading: true }));
            try {
                await editorEngine.image.delete(deleteState.imageToDelete);
                setDeleteState({
                    imageToDelete: null,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Image delete error:', error);
                setDeleteState((prev) => ({ ...prev, isLoading: false }));
            }
        }
    }, [deleteState.imageToDelete, editorEngine.image]);

    const handleRenameImage = useCallback((image: ImageContentData) => {
        setRenameState({
            imageToRename: image.fileName,
            newImageName: image.fileName,
            originImagePath: image.originPath,
            error: null,
            isLoading: false,
        });
    }, []);

    const handleRenameInputBlur = useCallback(
        (value: string) => {
            if (value.trim() === '') {
                setRenameState((prev) => ({ ...prev, error: 'Image name cannot be empty' }));
                return;
            }
            if (renameState.imageToRename) {
                const extension = renameState.imageToRename.split('.').pop() ?? '';
                const newBaseName = value.replace(`.${extension}`, '');
                const proposedNewName = `${newBaseName}.${extension}`;

                if (proposedNewName !== renameState.imageToRename) {
                    setRenameState((prev) => ({ ...prev, newImageName: proposedNewName }));
                } else {
                    setRenameState({
                        imageToRename: null,
                        originImagePath: null,
                        newImageName: '',
                        error: null,
                        isLoading: false,
                    });
                }
            } else {
                setRenameState({
                    imageToRename: null,
                    originImagePath: null,
                    newImageName: '',
                    error: null,
                    isLoading: false,
                });
            }
        },
        [renameState.imageToRename],
    );

    const onRenameImage = useCallback(
        async (newName: string) => {
            setRenameState((prev) => ({ ...prev, isLoading: true }));
            try {
                if (
                    renameState.originImagePath &&
                    newName &&
                    newName !== renameState.imageToRename
                ) {
                    await editorEngine.image.rename(renameState.originImagePath, newName);
                }
                setRenameState({
                    imageToRename: null,
                    originImagePath: null,
                    newImageName: '',
                    error: null,
                    isLoading: false,
                });
            } catch (error) {
                setRenameState((prev) => ({
                    ...prev,
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Failed to rename image. Please try again.',
                    isLoading: false,
                }));
                console.error('Image rename error:', error);
            }
        },
        [renameState.originImagePath, renameState.imageToRename, editorEngine.image],
    );

    useEffect(() => {
        if (renameState.error) {
            const timer = setTimeout(() => {
                setRenameState((prev) => ({ ...prev, error: null }));
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [renameState.error]);

    const handleImageDragStart = useCallback(
        (e: React.DragEvent<HTMLDivElement>, image: ImageContentData) => {
            e.dataTransfer.setData(
                'application/json',
                JSON.stringify({
                    type: 'image',
                    fileName: image.fileName,
                    content: image.content,
                    mimeType: image.mimeType,
                }),
            );

            sendAnalytics('image drag');
        },
        [],
    );

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearch('');
            inputRef.current?.blur();
        }
    }, []);

    const handleOpenFolder = useCallback(
        async (filePath: string) => {
            if (!filePath) {
                return;
            }
            editorEngine.state.rightPanelTab = EditorTabValue.DEV;

            await editorEngine.ide.openFile(filePath);
        },
        [editorEngine.state, editorEngine.ide],
    );

    const handleSearchClear = useCallback(() => {
        setSearch('');
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    }, []);

    const handleDeleteModalToggle = useCallback(() => {
        setDeleteState({
            imageToDelete: null,
            isLoading: false,
        });
    }, []);

    const handleRenameModalToggle = useCallback(() => {
        setRenameState({
            imageToRename: null,
            originImagePath: null,
            newImageName: '',
            error: null,
            isLoading: false,
        });
    }, []);

    const handleImageMouseDown = useCallback(() => {
        editorEngine.state.editorMode = EditorMode.INSERT_IMAGE;
    }, [editorEngine.state]);

    const handleImageMouseUp = useCallback(() => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
    }, [editorEngine.state]);

    const handleImageDragEnd = useCallback(() => {
        // for (const frameView of editorEngine.frames.webviews.values()) {
        //     frameView.frameView.style.pointerEvents = 'auto';
        // }
        // editorEngine.mode = EditorMode.DESIGN;
    }, []);

    // Check if any operation is loading
    const isAnyOperationLoading =
        uploadState.isUploading ||
        deleteState.isLoading ||
        renameState.isLoading ||
        editorEngine.image.isScanning ||
        editorEngine.sandbox.isIndexingFiles;


    return (
        <div className="w-full h-full flex flex-col gap-2 p-3 overflow-x-hidden">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                id="images-upload"
                onChange={handleUploadFile}
                multiple
                disabled={isAnyOperationLoading}
            />
            {uploadState.error && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {uploadState.error}
                </div>
            )}
            {uploadState.isUploading && (
                <div className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-2">
                    <Icons.Reload className="w-4 h-4 animate-spin" />
                    Uploading image...
                </div>
            )}
            {renameState.error && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {renameState.error}
                </div>
            )}
            {isAnyOperationLoading && (
                <div className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-2">
                    <Icons.Reload className="w-4 h-4 animate-spin" />
                    Indexing images...
                </div>
            )}
            {!!imageAssets.length && (
                <div className="flex flex-row items-center gap-2 m-0">
                    <div className="relative min-w-0 flex-1">
                        <Input
                            ref={inputRef}
                            className="h-8 text-xs pr-8 w-full"
                            placeholder="Search images"
                            value={search}
                            onChange={handleSearchChange}
                            onKeyDown={handleKeyDown}
                            disabled={isAnyOperationLoading}
                        />
                        {search && (
                            <button
                                className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleSearchClear}
                                disabled={isAnyOperationLoading}
                            >
                                <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                            </button>
                        )}
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={'default'}
                                size={'icon'}
                                className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                                onClick={handleClickAddButton}
                                disabled={isAnyOperationLoading}
                            >
                                <Icons.Plus />
                            </Button>
                        </TooltipTrigger>
                        <TooltipPortal>
                            <TooltipContent>
                                <p>Upload an image</p>
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
                </div>
            )}
            {!isAnyOperationLoading && (
                <div
                    className={cn(
                        'flex-1 overflow-y-auto',
                        '[&[data-dragging-image=true]]:bg-teal-500/40',
                        isDragging && 'cursor-copy',
                        isAnyOperationLoading && 'pointer-events-none opacity-75',
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                >
                    {imageAssets.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center opacity-70">
                            <div>
                                <Button
                                    onClick={handleClickAddButton}
                                    variant={'ghost'}
                                    size={'icon'}
                                    className="p-2 w-fit h-fit hover:bg-background-onlook"
                                    disabled={isAnyOperationLoading}
                                >
                                    <Icons.Plus />
                                </Button>
                                <span className="block w-2/3 mx-auto text-xs">
                                    Upload images using the Plus icon
                                </span>
                            </div>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-xs text-foreground-primary/50">
                            No images found
                        </div>
                    ) : (
                        <div className="w-full grid grid-cols-2 gap-3 p-0">
                            {filteredImages.map((image) => (
                                <ImageItem
                                    key={image.originPath}
                                    image={image}
                                    isRenaming={renameState.imageToRename === image.fileName}
                                    isDisabled={isAnyOperationLoading}
                                    onDragStart={handleImageDragStart}
                                    onDragEnd={handleImageDragEnd}
                                    onMouseDown={handleImageMouseDown}
                                    onMouseUp={handleImageMouseUp}
                                    onRenameBlur={handleRenameInputBlur}
                                    onRenameCancel={() =>
                                        setRenameState((prev) => ({ ...prev, imageToRename: null }))
                                    }
                                    onRename={handleRenameImage}
                                    onDelete={handleDeleteImage}
                                    onOpenFolder={handleOpenFolder}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
            <DeleteImageModal
                onDelete={onDeleteImage}
                isOpen={!!deleteState.imageToDelete}
                toggleOpen={handleDeleteModalToggle}
                isLoading={deleteState.isLoading}
            />
            <RenameImageModal
                onRename={onRenameImage}
                isOpen={
                    !!renameState.imageToRename &&
                    !!renameState.newImageName &&
                    renameState.newImageName !== renameState.imageToRename
                }
                toggleOpen={handleRenameModalToggle}
                newName={renameState.newImageName}
                isLoading={renameState.isLoading}
            />
        </div>
    );
});

const ImageItem = memo(
    ({
        image,
        isRenaming,
        isDisabled,
        onDragStart,
        onDragEnd,
        onMouseDown,
        onMouseUp,
        onRenameBlur,
        onRenameCancel,
        onRename,
        onDelete,
        onOpenFolder,
    }: {
        image: ImageContentData;
        isRenaming: boolean;
        isDisabled: boolean;
        onDragStart: (e: React.DragEvent<HTMLDivElement>, image: ImageContentData) => void;
        onDragEnd: () => void;
        onMouseDown: () => void;
        onMouseUp: () => void;
        onRenameBlur: (value: string) => void;
        onRenameCancel: () => void;
        onRename: (image: ImageContentData) => void;
        onDelete: (image: ImageContentData) => void;
        onOpenFolder: (path: string) => void;
    }) => {
        const handleDragStart = useCallback(
            (e: React.DragEvent<HTMLDivElement>) => {
                if (isDisabled) {
                    e.preventDefault();
                    return;
                }
                onDragStart(e, image);
            },
            [onDragStart, image, isDisabled],
        );

        const handleRenameBlur = useCallback(
            (e: React.FocusEvent<HTMLInputElement>) => {
                onRenameBlur(e.target.value);
            },
            [onRenameBlur],
        );

        const handleRenameKeyDown = useCallback(
            (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                    onRenameCancel();
                }
            },
            [onRenameCancel],
        );

        const handleRename = useCallback(() => {
            if (!isDisabled) {
                onRename(image);
            }
        }, [onRename, image, isDisabled]);

        const handleDelete = useCallback(() => {
            if (!isDisabled) {
                onDelete(image);
            }
        }, [onDelete, image, isDisabled]);

        const handleOpenFolder = useCallback(() => {
            if (!isDisabled) {
                onOpenFolder(image.originPath);
            }
        }, [onOpenFolder, image.originPath, isDisabled]);

        const handleMouseDown = useCallback(() => {
            if (!isDisabled) {
                onMouseDown();
            }
        }, [onMouseDown, isDisabled]);

        const handleMouseUp = useCallback(() => {
            if (!isDisabled) {
                onMouseUp();
            }
        }, [onMouseUp, isDisabled]);

        const defaultValue = useMemo(() => {
            return image.fileName.replace(/\.[^/.]+$/, '');
        }, [image.fileName]);

        return (
            <div
                className={cn(
                    'relative group w-full',
                    isDisabled && 'opacity-50 pointer-events-none',
                )}
                draggable={!isDisabled}
                onDragStart={handleDragStart}
                onDragEnd={onDragEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                <div className="w-full aspect-square flex flex-col justify-center rounded-lg overflow-hidden items-center cursor-move border-[0.5px] border-border">
                    <img
                        className="w-full h-full object-cover"
                        src={image.content}
                        alt={image.fileName}
                    />
                </div>
                <span className="text-xs block w-full text-center truncate">
                    {isRenaming ? (
                        <input
                            type="text"
                            className="w-full p-1 text-center bg-background-active rounded "
                            defaultValue={defaultValue}
                            autoFocus
                            onBlur={handleRenameBlur}
                            onKeyDown={handleRenameKeyDown}
                            disabled={isDisabled}
                        />
                    ) : (
                        image.fileName
                    )}
                </span>
                <ImageDropdownMenu
                    image={image}
                    handleRenameImage={handleRename}
                    handleDeleteImage={handleDelete}
                    handleOpenFolder={handleOpenFolder}
                    isDisabled={isDisabled}
                />
            </div>
        );
    },
);

const ImageDropdownMenu = memo(
    ({
        image,
        handleRenameImage,
        handleDeleteImage,
        handleOpenFolder,
        isDisabled,
    }: {
        image: ImageContentData;
        handleRenameImage: () => void;
        handleDeleteImage: () => void;
        handleOpenFolder: () => void;
        isDisabled: boolean;
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

        const isVisible = useMemo(() => {
            return activeDropdown === image.fileName;
        }, [activeDropdown, image.fileName]);

        return (
            <div
                className={`absolute right-2 top-2 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
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
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    },
);

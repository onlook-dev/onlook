import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { invokeMainChannel, platformSlash } from '@/lib/utils';
import type { ImageContentData } from '@onlook/models';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteImageModal from './DeleteModal';
import RenameImageModal from './RenameModal';

const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const imageFolder: string | null = projectsManager.project?.folderPath
        ? `${projectsManager.project.folderPath}${platformSlash}${DefaultSettings.IMAGE_FOLDER}`
        : null;
    const [imageToDelete, setImageToDelete] = useState<string | null>(null);
    const [imageToRename, setImageToRename] = useState<string | null>(null);
    const [newImageName, setNewImageName] = useState<string>('');
    const [renameError, setRenameError] = useState<string | null>(null);

    useEffect(() => {
        scanImages();
    }, []);

    const imageAssets = useMemo(() => {
        return editorEngine.image.assets;
    }, [editorEngine.image.assets]);

    const scanImages = () => {
        editorEngine.image.scanImages();
    };

    const uploadImage = async (file: File) => {
        setUploadError(null);

        if (!file.type.startsWith('image/')) {
            setUploadError('Please select a valid image file');
            return;
        }
        try {
            await editorEngine.image.upload(file);
        } catch (error) {
            setUploadError('Failed to upload image. Please try again.');
            console.error('Image upload error:', error);
        }
    };

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        for (const imageFile of imageFiles) {
            await uploadImage(imageFile);
        }
    };

    const handleClickAddButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.blur(); // Removes focus from the button to prevent tooltip from showing
        const input = document.getElementById('images-upload');
        if (input) {
            input.click();
        }
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearch(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const filteredImages = useMemo(() => {
        if (!search.trim()) {
            return imageAssets;
        }
        const searchLower = search.toLowerCase();
        return imageAssets.filter((image) => image.fileName?.toLowerCase()?.includes(searchLower));
    }, [imageAssets, search]);

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
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
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleDragStateChange(true, e);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            handleDragStateChange(false, e);
        }
    };

    const handleDragStateChange = (isDragging: boolean, e: React.DragEvent<HTMLDivElement>) => {
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
    };

    const handleDeleteImage = (image: ImageContentData) => {
        setImageToDelete(image.fileName);
    };

    const onDeleteImage = () => {
        if (imageToDelete) {
            editorEngine.image.delete(imageToDelete);
            setImageToDelete(null);
        }
    };

    const handleRenameImage = (image: ImageContentData) => {
        setImageToRename(image.fileName);
        setNewImageName(image.fileName);
    };

    const handleRenameInputBlur = (value: string) => {
        if (value.trim() === '') {
            setRenameError('Image name cannot be empty');
            return;
        }
        if (imageToRename) {
            const extension = imageToRename.split('.').pop() || '';
            const newBaseName = value.replace(`.${extension}`, '');
            const proposedNewName = `${newBaseName}.${extension}`;

            if (proposedNewName !== imageToRename) {
                setNewImageName(proposedNewName);
            } else {
                setImageToRename(null);
            }
        }
    };

    const onRenameImage = async (newName: string) => {
        try {
            if (imageToRename && newName && newName !== imageToRename) {
                await editorEngine.image.rename(imageToRename, newName);
            }
        } catch (error) {
            setRenameError(
                error instanceof Error
                    ? error.message
                    : 'Failed to rename image. Please try again.',
            );
            console.error('Image rename error:', error);
            return;
        } finally {
            setImageToRename(null);
            setNewImageName('');
        }
    };

    useEffect(() => {
        if (renameError) {
            const timer = setTimeout(() => {
                setRenameError(null);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [renameError]);

    const handleImageDragStart = (e: React.DragEvent<HTMLDivElement>, image: ImageContentData) => {
        e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
                type: 'image',
                fileName: image.fileName,
                content: image.content,
                mimeType: image.mimeType,
            }),
        );

        for (const webview of editorEngine.webviews.webviews.values()) {
            webview.webview.style.pointerEvents = 'none';
        }

        editorEngine.mode = EditorMode.INSERT_IMAGE;
    };

    return (
        <div className="w-full h-[calc(100vh-7.75rem)] flex flex-col gap-2">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                id="images-upload"
                onChange={handleUploadFile}
                multiple
            />
            {uploadError && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {uploadError}
                </div>
            )}
            {renameError && (
                <div className="mb-2 px-3 py-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {renameError}
                </div>
            )}
            {!!imageAssets.length && (
                <div className="flex items-center gap-2">
                    <div className="relative w-full">
                        <input
                            placeholder="Search"
                            className="flex h-9 w-full rounded border-none bg-secondary px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-background-active focus-visible:border-border-active focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                            type="text"
                            onChange={handleSearch}
                        />
                        <div className="absolute pointer-events-none inset-y-0 right-0 h-full flex px-2 items-center justify-center">
                            <Icons.MagnifyingGlass className="text-foreground-secondary" />
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={'ghost'} size={'icon'} onClick={handleClickAddButton}>
                                <Icons.Plus />
                            </Button>
                        </TooltipTrigger>
                        <TooltipPortal>
                            <TooltipContent side="top" sideOffset={5}>
                                Upload an image
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
                </div>
            )}
            <div
                className={cn(
                    'flex-1 overflow-y-auto',
                    '[&[data-dragging-image=true]]:bg-teal-500/40',
                    isDragging && 'cursor-copy',
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
                            >
                                <Icons.Plus />
                            </Button>
                            <span className="block w-2/3 mx-auto text-sm">
                                Upload images using the Plus icon
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex flex-wrap gap-2 p-2">
                        {filteredImages.map((image) => (
                            <div
                                key={image.fileName}
                                className="relative group flex-shrink-0 w-[120px]"
                                draggable
                                onDragStart={(e) => handleImageDragStart(e, image)}
                                onDragEnd={() => {
                                    for (const webview of editorEngine.webviews.webviews.values()) {
                                        webview.webview.style.pointerEvents = 'auto';
                                    }
                                    editorEngine.mode = EditorMode.DESIGN;
                                }}
                                onMouseDown={() => (editorEngine.mode = EditorMode.INSERT_IMAGE)}
                                onMouseUp={() => (editorEngine.mode = EditorMode.DESIGN)}
                            >
                                <div className="w-full h-[120px] flex flex-col justify-center rounded-lg overflow-hidden items-center cursor-move">
                                    <img
                                        className="w-full h-full object-cover"
                                        src={image.content}
                                        alt={image.fileName}
                                    />
                                </div>
                                <span className="text-xs block w-full text-center truncate">
                                    {imageToRename === image.fileName ? (
                                        <input
                                            type="text"
                                            className="w-full p-1 text-center bg-background-active rounded "
                                            defaultValue={image.fileName.replace(/\.[^/.]+$/, '')}
                                            autoFocus
                                            onBlur={(e) => handleRenameInputBlur(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                }
                                                if (e.key === 'Escape') {
                                                    setImageToRename(null);
                                                }
                                            }}
                                        />
                                    ) : (
                                        image.fileName
                                    )}
                                </span>
                                <div
                                    className={`absolute right-2 top-2 ${
                                        activeDropdown === image.fileName
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                    } group-hover:opacity-100 transition-opacity duration-300`}
                                >
                                    <DropdownMenu
                                        onOpenChange={(isOpen) =>
                                            setActiveDropdown(isOpen ? image.fileName : null)
                                        }
                                    >
                                        <DropdownMenuTrigger>
                                            <Button
                                                variant={'ghost'}
                                                className="bg-background p-1 inline-flex items-center justify-center h-auto w-auto rounded shadow-sm"
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
                                                    onClick={() => handleRenameImage(image)}
                                                    variant={'ghost'}
                                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
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
                                                    onClick={() => handleDeleteImage(image)}
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
                                                    onClick={() => {
                                                        if (!imageFolder) {
                                                            return;
                                                        }
                                                        invokeMainChannel(
                                                            MainChannels.OPEN_IN_EXPLORER,
                                                            imageFolder,
                                                        );
                                                    }}
                                                >
                                                    <span className="flex w-full text-smallPlus items-center">
                                                        <Icons.File className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                                        <span>Open Folder</span>
                                                    </span>
                                                </Button>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <DeleteImageModal
                onDelete={onDeleteImage}
                isOpen={!!imageToDelete}
                toggleOpen={() => setImageToDelete(null)}
            />
            <RenameImageModal
                onRename={onRenameImage}
                isOpen={!!imageToRename && !!newImageName && newImageName !== imageToRename}
                toggleOpen={() => {
                    setImageToRename(null);
                    setNewImageName('');
                }}
                newName={newImageName}
            />
        </div>
    );
});

export default ImagesTab;

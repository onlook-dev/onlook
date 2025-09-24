'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import type { ImageContentData } from '@onlook/models';
import { DefaultSettings } from '@onlook/constants';
import { LeftPanelTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { addImageFolderPrefix } from '@onlook/utility';

import type { ImageFit } from '../hooks/use-background-image-update';
import { useEditorEngine } from '@/components/store/editor';
import { useBackgroundImage } from '../hooks/use-background-image-update';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ToolbarButton } from '../toolbar-button';

export const InputImage = observer(() => {
    const editorEngine = useEditorEngine();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const previewImage = editorEngine.image.previewImage ?? editorEngine.image.selectedImage;

    const {
        IMAGE_FIT_OPTIONS,
        fillOption,
        currentBackgroundImage,
        handleFillOptionChange,
        removeBackground,
    } = useBackgroundImage(editorEngine);

    const currentFillOptionLabel =
        IMAGE_FIT_OPTIONS.find((opt) => opt.value === fillOption)?.label ?? 'Fill';

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'input-image-dropdown',
    });

    const handleSelectFromLibrary = useCallback(() => {
        editorEngine.state.leftPanelTab = LeftPanelTabValue.IMAGES;
        editorEngine.state.leftPanelLocked = true;
    }, []);

    const handleUploadFromComputer = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file?.type.startsWith('image/')) {
            setUploadError('Please select a valid image file');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            await editorEngine.image.upload(file, DefaultSettings.IMAGE_FOLDER);

            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                const imageData: ImageContentData = {
                    originPath: `${DefaultSettings.IMAGE_FOLDER}/${file.name}`,
                    content: result,
                    fileName: file.name,
                    mimeType: file.type,
                };

                editorEngine.image.setSelectedImage(imageData);
                editorEngine.image.setPreviewImage(imageData);
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Failed to upload image:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
            setIsUploading(false);
        }

        e.target.value = '';
    }, []);

    const handleFillOptionChangeInternal = (option: ImageFit) => {
        handleFillOptionChange(option);
    };

    const handleClose = () => {
        editorEngine.image.setIsSelectingImage(false);
        editorEngine.image.setPreviewImage(null);
        editorEngine.image.setSelectedImage(null);
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        if (open) {
            onOpenChange(true);
        }
    };

    const loadImage = async () => {
        editorEngine.image.setIsSelectingImage(true);
        if (currentBackgroundImage) {
            const absolutePath = addImageFolderPrefix(currentBackgroundImage);

            const content = await editorEngine.image.readImageContent(absolutePath);
            if (content) {
                editorEngine.image.setSelectedImage(content);
            }
        } else {
            editorEngine.image.setSelectedImage(null);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadImage();
        } else {
            editorEngine.image.setIsSelectingImage(false);
        }
    }, [isOpen]);

    return (
        <div className="flex flex-col gap-2">
            <DropdownMenu open={isOpen} onOpenChange={handleOpenChange} modal={false}>
                <HoverOnlyTooltip
                    content="Image Fill"
                    side="bottom"
                    className="mt-1"
                    hideArrow
                    disabled={isOpen}
                >
                    <DropdownMenuTrigger asChild>
                        <ToolbarButton
                            isOpen={isOpen}
                            className="relative flex w-9 flex-col items-center justify-center gap-0.5"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                            ) : currentBackgroundImage ? (
                                <div
                                    className="h-6 w-6 bg-cover bg-center"
                                    style={{
                                        backgroundImage: currentBackgroundImage,
                                    }}
                                />
                            ) : (
                                <Icons.Image className="h-2 w-2" />
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 animate-pulse rounded bg-blue-500/20" />
                            )}
                        </ToolbarButton>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
                <DropdownMenuContent
                    align="start"
                    side="bottom"
                    className="mt-1 w-[280px] overflow-hidden rounded-lg shadow-xl backdrop-blur-lg"
                >
                    <div className="flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3">
                            <h3 className="text-foreground text-sm font-medium">Image Fill</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0"
                                onClick={handleClose}
                                disabled={isUploading}
                            >
                                <Icons.CrossL className="h-4 w-4" />
                            </Button>
                        </div>
                        <Separator />
                        <div className="flex flex-col gap-3 p-3">
                            {/* Fill Options */}
                            <div className="flex items-center gap-4">
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="bg-background-tertiary/50 border-border hover:bg-background-tertiary/70 w-32 justify-between"
                                            disabled={isUploading}
                                        >
                                            <>
                                                {currentFillOptionLabel}
                                                <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                                            </>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-32">
                                        {IMAGE_FIT_OPTIONS.map((option) => (
                                            <DropdownMenuItem
                                                key={option.value}
                                                onClick={() =>
                                                    handleFillOptionChangeInternal(option.value)
                                                }
                                                className="text-sm"
                                                disabled={isUploading}
                                            >
                                                {option.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Image preview */}
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gradient-to-br from-blue-400 to-blue-600">
                                {previewImage ? (
                                    <>
                                        <img
                                            src={previewImage.content}
                                            alt="Preview"
                                            className="h-full w-full object-cover"
                                        />
                                        {isUploading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10">
                                                <div className="rounded-full bg-white/90 p-2">
                                                    <Icons.LoadingSpinner className="h-4 w-4 animate-spin text-blue-600" />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                                        <Icons.Image className="h-12 w-12 text-white/50" />
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            <Button
                                onClick={handleSelectFromLibrary}
                                variant="outline"
                                className="border-border w-full justify-start gap-2 !bg-gray-50 text-black hover:bg-gray-200 hover:text-black"
                                disabled={isUploading}
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Library className="h-4 w-4" />
                                    Select from library
                                </div>
                            </Button>
                            <Button
                                onClick={handleUploadFromComputer}
                                variant="outline"
                                disabled={isUploading}
                                className="border-border w-full justify-start gap-2 bg-gray-700 text-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-2">
                                    {isUploading ? (
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Icons.Upload className="h-4 w-4" />
                                    )}
                                    {isUploading ? 'Uploading...' : 'Upload from computer'}
                                </div>
                            </Button>

                            {uploadError && (
                                <div className="mt-1 px-1 text-xs text-red-500">{uploadError}</div>
                            )}

                            {currentBackgroundImage && (
                                <Button
                                    onClick={removeBackground}
                                    variant="outline"
                                    className="w-full justify-start gap-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                    disabled={isUploading}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icons.CrossL className="h-4 w-4" />
                                        Remove background
                                    </div>
                                </Button>
                            )}
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
});

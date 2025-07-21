'use client';

import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings } from '@onlook/constants';
import { LeftPanelTabValue, type ImageContentData } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { ToolbarButton } from '../toolbar-button';
import { useBackgroundImage } from '../hooks/use-background-image-update';

const FILL_OPTIONS = ['Fill', 'Fit', 'Stretch', 'Center', 'Tile', 'Auto'];


export const InputImage = observer(
    () => {
        const editorEngine = useEditorEngine();
        const fileInputRef = useRef<HTMLInputElement>(null);
        const [isUploading, setIsUploading] = useState(false);
        const [uploadError, setUploadError] = useState<string | null>(null);
        
        const isSelectingImage = editorEngine.image.isSelectingImage;
        const selectedImage = editorEngine.image.selectedImage;
        
        const {
            fillOption,
            currentBackgroundImage,
            handleFillOptionChange,
            removeBackground,
        } = useBackgroundImage(editorEngine);


        const currentFillOption = fillOption;

        const { isOpen, onOpenChange } = useDropdownControl({
            id: 'input-image-dropdown',
        });

        const handleSelectFromLibrary = useCallback(() => {
            editorEngine.image.setIsSelectingImage(true);
            // Open the images tab in the left sidebar
            editorEngine.state.leftPanelTab = LeftPanelTabValue.IMAGES;
            editorEngine.state.leftPanelLocked = true;
        }, []);

        const handleUploadFromComputer = useCallback(() => {
            fileInputRef.current?.click();
        }, []);

        const handleFileChange = useCallback(
            async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                        setIsUploading(false);
                    };
                    reader.readAsDataURL(file);
                } catch (error) {
                    console.error('Failed to upload image:', error);
                    setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
                    setIsUploading(false);
                }

                // Clear the input so the same file can be selected again
                e.target.value = '';
            },
            [editorEngine],
        );

        const handleFillOptionChangeInternal = useCallback(
            (option: string) => {
                handleFillOptionChange(option);
            },
            [handleFillOptionChange],
        );

        const previewStyle = useMemo(() => {
            if (selectedImage) {
                return { backgroundImage: `url(${selectedImage.content})` };
            }
            if (currentBackgroundImage) {
                return { backgroundImage: `url(${currentBackgroundImage})` };
            }
            return { backgroundColor: '#3b82f6' }; // Default blue background
        }, [selectedImage, currentBackgroundImage]);

        const previewImage = useMemo(() => {
            return selectedImage?.content ?? currentBackgroundImage;
        }, [selectedImage, currentBackgroundImage]);

        const handleClose = useCallback(() => {
            editorEngine.image.setSelectedImage(null);
            editorEngine.image.setIsSelectingImage(false);
        }, []);

        const handleRemoveBackground = useCallback(() => {
            removeBackground();
        }, [removeBackground]);

        return (
            <div className="flex flex-col gap-2">
                <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
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
                                className="flex w-10 flex-col items-center justify-center gap-0.5"
                            >
                                {selectedImage ? (
                                    <div
                                        className="h-6 w-6 bg-cover bg-center"
                                        style={previewStyle}
                                    />
                                ) : (
                                    <Icons.Image className="h-2 w-2" />
                                )}
                            </ToolbarButton>
                        </DropdownMenuTrigger>
                    </HoverOnlyTooltip>
                    <DropdownMenuContent
                        align="start"
                        side="bottom"
                        className="w-[280px] mt-1 rounded-lg overflow-hidden shadow-xl backdrop-blur-lg"
                    >
                        <div className="flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-3">
                                <h3 className="text-sm font-medium text-foreground">Image Fill</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0"
                                    onClick={handleClose}
                                >
                                    <Icons.CrossL className="h-4 w-4" />
                                </Button>
                            </div>
                            <Separator />
                            <div className="p-3 flex flex-col gap-3">
                                {/* Fill Options */}
                                <div className="flex items-center gap-4">
                                    <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-32 justify-between bg-background-tertiary/50 border-border hover:bg-background-tertiary/70"
                                            >
                                                {currentFillOption}
                                                <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-32">
                                            {FILL_OPTIONS.map((option) => (
                                                <DropdownMenuItem
                                                    key={option}
                                                    onClick={() => handleFillOptionChangeInternal(option)}
                                                    className="text-sm"
                                                >
                                                    {option}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button variant="ghost" size="sm" className="p-2 h-8 w-8">
                                        <Icons.Reset className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Image preview */}
                                <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg overflow-hidden relative">
                                    {previewImage ? (
                                        <>
                                            <img
                                                src={previewImage}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                            <Icons.Image className="w-12 h-12 text-white/50" />
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <Button
                                    onClick={handleSelectFromLibrary}
                                    variant="outline"
                                    className="w-full justify-start gap-2 bg-gray-50! hover:bg-gray-200 text-black border-border hover:text-black"
                                >
                                    <div className="flex items-center gap-2">
                                        <Icons.Library className="w-4 h-4" />
                                        Select from library
                                    </div>
                                </Button>
                                <Button
                                    onClick={handleUploadFromComputer}
                                    variant="outline"
                                    disabled={isUploading}
                                    className="w-full justify-start gap-2 bg-gray-700 text-white border-border hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-2">
                                        {isUploading ? (
                                            <Icons.LoadingSpinner className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Icons.Upload className="w-4 h-4" />
                                        )}
                                        {isUploading ? 'Uploading...' : 'Upload from computer'}
                                    </div>
                                </Button>
                                
                                {uploadError && (
                                    <div className="text-red-500 text-xs mt-1 px-1">
                                        {uploadError}
                                    </div>
                                )}
                                
                                {currentBackgroundImage && (
                                    <Button
                                        onClick={handleRemoveBackground}
                                        variant="outline"
                                        className="w-full justify-start gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icons.CrossL className="w-4 h-4" />
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
    },
);

'use client';

import { useEditorEngine } from '@/components/store/editor';
import { LeftPanelTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useRef, useState } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { ToolbarButton } from '../toolbar-button';

const FILL_OPTIONS = ['Fill', 'Fit', 'Stretch', 'Center', 'Tile'];

interface InputImageProps {
    value?: string;
    fillOption?: string;
    onChange?: (value: string) => void;
    onFillChange?: (value: string) => void;
}

export const InputImage = observer(({
    value,
    fillOption = 'Fill',
    onChange,
    onFillChange,
}: InputImageProps) => {
    const editorEngine = useEditorEngine();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(value ?? null);

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'input-image-dropdown',
    });

    const handleSelectFromLibrary = useCallback(() => {
        // Open the images tab in the left sidebar
        editorEngine.state.leftPanelTab = LeftPanelTabValue.IMAGES;
        editorEngine.state.leftPanelLocked = true;
        onOpenChange(false);
    }, [editorEngine, onOpenChange]);

    const handleUploadFromComputer = useCallback(() => {
        fileInputRef.current?.click();
        onOpenChange(false);
    }, [onOpenChange]);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file?.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result as string;
                    setPreviewImage(result);
                    onChange?.(result);
                };
                reader.readAsDataURL(file);
            }
            // Clear the input so the same file can be selected again
            e.target.value = '';
        },
        [onChange],
    );

    const handleFillOptionChange = useCallback(
        (option: string) => {
            onFillChange?.(option);
        },
        [onFillChange],
    );

    const previewStyle = useMemo(() => {
        if (previewImage) {
            return { backgroundImage: `url(${previewImage})` };
        }
        return { backgroundColor: '#3b82f6' }; // Default blue background
    }, [previewImage]);

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
                            <Icons.Image className="h-2 w-2" />
                            <div 
                                className="h-[4px] w-6 rounded-full bg-cover bg-center" 
                                style={previewStyle} 
                            />
                        </ToolbarButton>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
                <DropdownMenuContent
                    align="start"
                    side="bottom"
                    className="w-[280px] mt-1 p-4 rounded-lg overflow-hidden shadow-xl backdrop-blur-lg"
                >
                    <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-foreground">Image Fill</h3>
                        </div>

                        {/* Fill option dropdown */}
                        <div className="flex items-center gap-4">
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-32 justify-between bg-background-tertiary/50 border-border hover:bg-background-tertiary/70"
                                    >
                                        {fillOption}
                                        <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-32">
                                    {FILL_OPTIONS.map((option) => (
                                        <DropdownMenuItem
                                            key={option}
                                            onClick={() => handleFillOptionChange(option)}
                                            className="text-sm"
                                        >
                                            {option}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 h-8 w-8"
                            >
                                <Icons.Reset className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Image preview */}
                        <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg overflow-hidden">
                            {previewImage ? (
                                <img
                                    src={previewImage}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                    <Icons.Image className="w-12 h-12 text-white/50" />
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={handleSelectFromLibrary}
                                variant="outline"
                                className="w-full justify-start gap-2 bg-white text-black border-border hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex">
                                        <div className="w-0.5 h-4 bg-black"></div>
                                        <div className="w-0.5 h-4 bg-black ml-0.5"></div>
                                    </div>
                                    Select from library
                                </div>
                            </Button>
                            <Button
                                onClick={handleUploadFromComputer}
                                variant="outline"
                                className="w-full justify-start gap-2 bg-background-tertiary/50 border-border hover:bg-background-tertiary/70"
                            >
                                <Icons.Upload className="w-4 h-4" />
                                Upload from computer
                            </Button>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
});

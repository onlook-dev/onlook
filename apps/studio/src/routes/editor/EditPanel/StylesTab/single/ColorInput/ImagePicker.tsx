import { useEditorEngine } from '@/components/Context';
import type { CompoundStyle } from '@/lib/editor/styles/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { memo, useCallback, useState } from 'react';

enum ImageFit {
    FILL = 'fill',
    FIT = 'fit',
    AUTO = 'auto',
    CROP = 'crop',
    TILE = 'tile',
}

const IMAGE_FIT_OPTIONS = [
    { value: ImageFit.FILL, label: 'Fill' },
    { value: ImageFit.FIT, label: 'Fit' },
    { value: ImageFit.AUTO, label: 'Auto' },
    { value: ImageFit.CROP, label: 'Crop' },
    { value: ImageFit.TILE, label: 'Tile' },
];

interface ImageData {
    url: string;
    base64: string;
    mimeType: string;
    fit: ImageFit;
}

const FitToStyle: Record<ImageFit, Record<string, string>> = {
    [ImageFit.FILL]: {
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.FIT]: {
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.AUTO]: {
        backgroundSize: 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.CROP]: {
        backgroundSize: '150%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    [ImageFit.TILE]: {
        backgroundSize: '50%',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
    },
};

const ImagePickerContent: React.FC<{ backgroundImage?: string; compoundStyle?: CompoundStyle }> = ({
    backgroundImage,
    compoundStyle,
}) => {
    const editorEngine = useEditorEngine();
    const [isDragging, setIsDragging] = useState(false);
    const getDefaultImageData = () => {
        const selectedStyle = editorEngine.style.selectedStyle?.styles;
        const url = backgroundImage;
        let fit = ImageFit.FILL;

        if (compoundStyle && selectedStyle) {
            const backgroundSize = compoundStyle.children
                .find((style) => style.key === 'backgroundSize')
                ?.getValue(selectedStyle);

            switch (backgroundSize) {
                case 'cover':
                    fit = ImageFit.FILL;
                    break;
                case 'contain':
                    fit = ImageFit.FIT;
                    break;
                case 'auto':
                    fit = ImageFit.AUTO;
                    break;
                case 'crop':
                    fit = ImageFit.CROP;
                    break;
                case 'tile':
                    fit = ImageFit.TILE;
                    break;
            }
        }

        return {
            url: url || '',
            fit,
            base64: '',
            mimeType: '',
        };
    };
    const [imageData, setImageData] = useState<ImageData | null>(getDefaultImageData());

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            saveImage(imageFile);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            saveImage(imageFile);
        }
    }, []);

    const handleButtonClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById('image-upload')?.click();
    }, []);

    const saveImage = async (file: File) => {
        const url = URL.createObjectURL(file);
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
            const newImageData: ImageData = {
                url,
                base64: reader.result as string,
                mimeType: file.type,
                fit: imageData?.fit || ImageFit.FILL,
            };
            setImageData(newImageData);
            editorEngine.image.insert(newImageData.base64, newImageData.mimeType);
        };

        reader.readAsDataURL(blob);
    };

    const updateImageFit = (fit: ImageFit) => {
        if (!imageData) {
            return;
        }

        const updatedImageData = { ...imageData, fit };
        setImageData(updatedImageData);
        for (const [key, value] of Object.entries(FitToStyle[fit])) {
            editorEngine.style.update(key, value);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 p-2 text-xs">
            <div
                className={`group h-32 w-full bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                style={{
                    backgroundImage: imageData ? `url(${imageData.url})` : 'none',
                    ...FitToStyle[imageData?.fit || ImageFit.FILL],
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <UploadButton onButtonClick={handleButtonClick} />
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={handleFileSelect}
                />
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 w-full flex items-center justify-between bg-background-secondary rounded text-foreground-primary hover:bg-background-secondary/90 transition-colors">
                    <span className="capitalize">{imageData?.fit || ImageFit.FILL}</span>
                    <Icons.ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52">
                    {IMAGE_FIT_OPTIONS.map(({ value, label }) => (
                        <DropdownMenuItem
                            key={value}
                            className="text-xs"
                            onClick={() => updateImageFit(value)}
                        >
                            {label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

const UploadButton: React.FC<{ onButtonClick: (e: React.MouseEvent) => void }> = memo(
    ({ onButtonClick }) => (
        <Button
            variant="secondary"
            className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20 opacity-0 group-hover:opacity-90 transition-opacity"
            type="button"
            onClick={onButtonClick}
        >
            <Icons.Upload className="w-3 h-3" />
            <span>Upload New Image</span>
        </Button>
    ),
);

UploadButton.displayName = 'UploadButton';

export default memo(ImagePickerContent);

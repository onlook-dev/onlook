import { useEditorEngine } from '@/components/Context';
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

const ImagePickerContent: React.FC = () => {
    const editorEngine = useEditorEngine();
    const [isDragging, setIsDragging] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageFit, setImageFit] = useState<ImageFit>(ImageFit.FILL);
    const [base64Image, setBase64Image] = useState<string | null>(null);
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
            const url = URL.createObjectURL(imageFile);
            saveImage(url);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            saveImage(url);
        }
    }, []);

    const handleButtonClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById('image-upload')?.click();
    }, []);

    const getStyleFromFit = (fit: ImageFit) => ({
        backgroundSize:
            fit === ImageFit.FIT
                ? 'contain'
                : fit === ImageFit.FILL
                  ? 'cover'
                  : fit === ImageFit.CROP
                    ? '150%'
                    : fit === ImageFit.TILE
                      ? '50%'
                      : 'auto',
        backgroundPosition: 'center',
        backgroundRepeat: fit === ImageFit.TILE ? 'repeat' : 'no-repeat',
    });

    const saveImage = async (url: string) => {
        // Convert image URL to base64
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64Image = reader.result as string;
            setImageUrl(url);
            setBase64Image(base64Image);
            editorEngine.image.insertBackground(base64Image, getStyleFromFit(imageFit));
        };

        reader.readAsDataURL(blob);
    };

    const updateImageFit = (fit: ImageFit) => {
        setImageFit(fit);
        if (base64Image) {
            editorEngine.image.insertBackground(base64Image, getStyleFromFit(fit));
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 p-2 text-xs">
            <div
                className={`group h-32 w-full bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                style={{
                    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                    ...getStyleFromFit(imageFit),
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
                    <span className="capitalize">{imageFit}</span>
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

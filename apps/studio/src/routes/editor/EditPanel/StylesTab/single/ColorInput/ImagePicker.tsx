import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useCallback, useState } from 'react';

const ImagePickerContent: React.FC = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageFit, setImageFit] = useState<'fill' | 'fit' | 'auto' | 'crop' | 'tile'>('fill');

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
            setImageUrl(url);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const imageFile = files.find((file) => file.type.startsWith('image/'));
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setImageUrl(url);
        }
    }, []);

    const handleButtonClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById('image-upload')?.click();
    }, []);

    return (
        <div className="flex flex-col items-center gap-2 p-2 text-xs">
            <div
                className={`group h-32 w-full bg-background-secondary rounded flex items-center justify-center p-4 
                    ${isDragging ? 'border-2 border-dashed border-primary' : ''}`}
                style={{
                    backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                    backgroundSize:
                        imageFit === 'fit'
                            ? 'contain'
                            : imageFit === 'fill'
                              ? 'cover'
                              : imageFit === 'crop'
                                ? '150%'
                                : imageFit === 'tile'
                                  ? '50%'
                                  : 'auto',
                    backgroundPosition: 'center',
                    backgroundRepeat: imageFit === 'tile' ? 'repeat' : 'no-repeat',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                    onChange={handleFileSelect}
                />
                <Button
                    variant="secondary"
                    className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20 opacity-0 group-hover:opacity-90 transition-opacity"
                    type="button"
                    onClick={handleButtonClick}
                >
                    <Icons.Upload className="w-3 h-3" />
                    <span>Upload New Image</span>
                </Button>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger className="px-2 py-1 w-full flex items-center justify-between bg-background-secondary rounded text-foreground-primary hover:bg-background-secondary/90 transition-colors">
                    <span className="capitalize">{imageFit}</span>
                    <Icons.ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52">
                    <DropdownMenuItem className="text-xs" onClick={() => setImageFit('fill')}>
                        Fill
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => setImageFit('fit')}>
                        Fit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => setImageFit('auto')}>
                        Auto
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => setImageFit('crop')}>
                        Crop
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => setImageFit('tile')}>
                        Tile
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default ImagePickerContent;

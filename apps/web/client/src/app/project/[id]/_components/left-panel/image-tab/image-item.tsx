import { type ImageContentData } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import { ImageDropdownMenu } from './image-dropdown-menu';
import { Icons } from '@onlook/ui/icons/index';

export const ImageItem = ({ image }: { image: ImageContentData }) => {
    // Stub state
    const [selectedImage] = useState<ImageContentData | null>(null);
    const [isSelectingImage] = useState(false);
    const [previewImage] = useState<ImageContentData | null>(null);
    const [isOperating] = useState(false);
    
    // Stub handlers
    const handleClick = () => {
        // Stub click handler
    };

    const handleDoubleClick = () => {
        // Stub double click handler  
    };

    const handleDragStart = () => {
        // Stub drag start
    };

    const handleDragEnd = () => {
        // Stub drag end
    };

    const handleMouseDown = () => {
        // Stub mouse down
    };

    const handleMouseUp = () => {
        // Stub mouse up
    };

    const isSelected = selectedImage?.originPath === image.originPath;
    const isPreview = previewImage?.originPath === image.originPath;

    return (
        <div
            className={cn('relative group w-full', isOperating && 'opacity-50 pointer-events-none')}
            draggable={!isOperating}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
        >
            <div
                className={cn(
                    'w-full aspect-square flex flex-col justify-center rounded-lg overflow-hidden items-center cursor-move border-[0.5px] border-border',
                    isSelected && 'border-2 border-red-500 p-1.5 rounded-xl cursor-pointer',
                    isPreview && 'border-2 ring-yellow-500 p-1.5 rounded-xl cursor-pointer',
                )}
            >
                <img
                    className="w-full h-full object-cover rounded-lg"
                    src={`data:${image.mimeType};base64,${image.content}`}
                    alt={image.fileName}
                    loading="lazy"
                />
                {isSelectingImage && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <Icons.LoadingSpinner className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                )}
            </div>
            <span className="text-xs block w-full text-center truncate mt-1">
                {image.fileName}
            </span>

            {!isOperating && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageDropdownMenu image={image} />
                </div>
            )}
            {isSelected && (
                <div className="bg-black-85 rounded-lg absolute bottom-7.5 right-2.5 p-1">
                    <Icons.CheckCircled className="w-3 h-3" />
                </div>
            )}
        </div>
    );
};
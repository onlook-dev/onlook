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
            className={cn(
                'group relative flex flex-col items-center justify-center p-2 rounded-md cursor-pointer transition-all duration-200',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                isSelected && 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500',
                isPreview && 'ring-2 ring-yellow-500',
                isOperating && 'opacity-50 pointer-events-none'
            )}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            draggable
        >
            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                    src={`data:${image.mimeType};base64,${image.content}`}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                {isSelectingImage && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <Icons.LoadingSpinner className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                )}
            </div>
            
            <div className="mt-2 text-xs text-center">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-16">
                    {image.fileName}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                    {image.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'}
                </div>
            </div>

            {!isOperating && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageDropdownMenu image={image} />
                </div>
            )}
        </div>
    );
};
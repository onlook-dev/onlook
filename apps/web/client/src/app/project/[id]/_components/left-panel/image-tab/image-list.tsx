import React, { memo, useState } from 'react';
import type { ImageContentData } from '@onlook/models';
import { ImageItem } from './image-item';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

interface ImageListProps {
    images: ImageContentData[];
    currentFolder: string;
}

export const ImageList = memo(({ images, currentFolder }: ImageListProps) => {
    // Stub state
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading] = useState(false);
    const [error] = useState<string | null>(null);

    // Stub handlers
    const handleClickAddButton = () => {
        // Stub add button handler
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Stub drop handler
    };

    return (
        <div
            className="flex flex-col gap-2 h-full"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <p className="text-sm text-gray-200 font-medium">Images</p>
            <div className={cn(isDragging && 'cursor-copy bg-teal-500/40', 'h-full')}>
                {isUploading && (
                    <div className="mb-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/50 rounded-md flex items-center gap-2">
                        <Icons.Reload className="w-4 h-4 animate-spin" />
                        Uploading image...
                    </div>
                )}
                {error && (
                    <div className="mb-2 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded-md flex items-center gap-2">
                        <Icons.ExclamationTriangle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                {images.length === 0 && !isDragging && (
                    <div className="h-full w-full flex items-center justify-center text-center opacity-70">
                        <Button
                            onClick={handleClickAddButton}
                            variant={'default'}
                            className="p-2.5 w-full h-fit gap-2 bg-gray-800 hover:bg-gray-700 text-white font-normal"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            Add your first image
                        </Button>
                    </div>
                )}
                {isDragging && (
                    <div className="h-full w-full flex items-center justify-center text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Icons.Upload className="w-8 h-8 text-teal-500" />
                            <p className="text-sm text-teal-600 dark:text-teal-400">
                                Drop images here to upload
                            </p>
                        </div>
                    </div>
                )}
                {images.length > 0 && !isDragging && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto">
                        {images.map((image) => (
                            <ImageItem key={image.originPath} image={image} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
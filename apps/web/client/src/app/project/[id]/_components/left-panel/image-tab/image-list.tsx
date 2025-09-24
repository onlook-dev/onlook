import React, { memo } from 'react';

import type { ImageContentData } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { ImageItem } from './image-item';
import { useImagesContext } from './providers/images-provider';

interface ImageListProps {
    images: ImageContentData[];
    currentFolder: string;
}

export const ImageList = memo(({ images, currentFolder }: ImageListProps) => {
    const { uploadOperations, error } = useImagesContext();
    const { handleClickAddButton, handleUploadFile, uploadState } = uploadOperations;

    const { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, isDragging } =
        useImageDragDrop(currentFolder);

    return (
        <div
            className="flex h-full flex-col gap-2"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <p className="text-sm font-medium text-gray-200">Images</p>
            <div className={cn(isDragging && 'cursor-copy bg-teal-500/40', 'h-full')}>
                {uploadState.isUploading && (
                    <div className="mb-2 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-600 dark:bg-blue-950/50">
                        <Icons.Reload className="h-4 w-4 animate-spin" />
                        Uploading image...
                    </div>
                )}
                {error && (
                    <div className="mb-2 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50">
                        <Icons.ExclamationTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}
                {images.length === 0 && (
                    <div className="flex h-full w-full items-center justify-center text-center opacity-70">
                        <Button
                            onClick={handleClickAddButton}
                            variant={'default'}
                            className="h-fit w-full gap-2 bg-gray-800 p-2.5 font-normal text-white hover:bg-gray-700"
                        >
                            <Icons.Plus />
                            <span>Add an Image</span>
                        </Button>
                    </div>
                )}
                <div className="grid w-full grid-cols-2 gap-3 overflow-y-auto p-0">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="images-upload"
                        onChange={(e) => handleUploadFile(e, currentFolder)}
                        multiple
                        disabled={uploadState.isUploading}
                    />
                    {images.map((image) => (
                        <ImageItem key={image.originPath} image={image} />
                    ))}
                </div>
            </div>
        </div>
    );
});

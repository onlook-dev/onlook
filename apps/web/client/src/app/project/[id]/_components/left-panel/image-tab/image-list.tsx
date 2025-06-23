import React, { memo } from 'react';
import type { ImageContentData } from '@onlook/models';
import { ImageItem } from './image-item';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useImagesContext } from './providers/images-provider';

interface ImageListProps {
    images: ImageContentData[];
}

export const ImageList = memo(({ images }: ImageListProps) => {
    const { uploadOperations } = useImagesContext();
    const { handleClickAddButton, handleUploadFile } = uploadOperations;
    if (images.length === 0) {
        return (
            <div className="flex items-center justify-center h-32 text-xs text-foreground-primary/50">
                No images found
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-200 font-medium">Images</p>
            <div className="w-full grid grid-cols-2 gap-3 p-0">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="images-upload"
                    onChange={handleUploadFile}
                    multiple
                    // disabled={isAnyOperationLoading}
                />
                {images.map((image) => (
                    <ImageItem key={image.originPath} image={image} />
                ))}
                {images.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center opacity-70">
                        <div>
                            <Button
                                onClick={handleClickAddButton}
                                variant={'ghost'}
                                size={'icon'}
                                className="p-2 w-fit h-fit hover:bg-background-onlook"
                            >
                                <Icons.Plus />
                            </Button>
                            <span className="block w-2/3 mx-auto text-xs">
                                Upload images using the Plus icon
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

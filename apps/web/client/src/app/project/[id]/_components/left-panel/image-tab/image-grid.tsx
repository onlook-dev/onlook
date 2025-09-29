'use client';

import { Icons } from '@onlook/ui/icons';
import { ImageItem } from './image-item';
import type { ImageData } from './types';

interface ImageGridProps {
    images: ImageData[];
    rootDir: string;
    search: string;
}

export const ImageGrid = ({ images, rootDir, search }: ImageGridProps) => {
    return (
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 gap-2">
                {images.map((image) => (
                    <ImageItem
                        key={image.path}
                        image={image}
                        rootDir={rootDir}
                    />
                ))}
            </div>
            {images.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-foreground-secondary">
                    <Icons.Image className="w-8 h-8 mb-2" />
                    <div className="text-sm">
                        {search ? 'No images match your search' : 'No images in this folder'}
                    </div>
                </div>
            )}
        </div>
    );
};
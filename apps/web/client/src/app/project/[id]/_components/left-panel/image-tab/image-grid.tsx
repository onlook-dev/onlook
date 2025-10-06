'use client';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useImageDragDrop } from './hooks/use-image-drag-drop';
import { ImageItem } from './image-item';
import type { ImageData } from './types';

interface ImageGridProps {
    images: ImageData[];
    projectId: string;
    branchId: string;
    search: string;
}

export const ImageGrid = ({ images, projectId, branchId, search, }: ImageGridProps) => {
    const {
        handleDragEnter, handleDragLeave, handleDragOver, isDragging,
        onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp
    } = useImageDragDrop();

    return (
        <div className={cn(
            "flex-1 overflow-auto",
            isDragging && 'cursor-copy bg-teal-500/40', 'h-full')
        }
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
        >
            <div className="grid grid-cols-2 gap-2">
                {images.map((image) => (
                    <ImageItem
                        key={image.path}
                        image={image}
                        projectId={projectId}
                        branchId={branchId}
                        onImageDragStart={onImageDragStart}
                        onImageDragEnd={onImageDragEnd}
                        onImageMouseDown={onImageMouseDown}
                        onImageMouseUp={onImageMouseUp}
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
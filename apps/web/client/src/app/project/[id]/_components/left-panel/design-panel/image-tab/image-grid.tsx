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
    onUpload: (files: FileList) => Promise<void>;
    onRename: (oldPath: string, newName: string) => Promise<void>;
    onDelete: (filePath: string) => Promise<void>;
    onAddToChat: (imagePath: string) => void;
}

export const ImageGrid = ({ images, projectId, branchId, search, onUpload, onRename, onDelete, onAddToChat }: ImageGridProps) => {
    const {
        handleDragEnter, handleDragLeave, handleDragOver, handleDrop, isDragging,
        onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp
    } = useImageDragDrop(onUpload);

    return (
        <div className={cn(
            "flex-1 overflow-auto",
            isDragging && 'cursor-copy bg-teal-500/40', 'h-full')
        }
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
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
                        onRename={onRename}
                        onDelete={onDelete}
                        onAddToChat={onAddToChat}
                    />
                ))}
            </div>
            {images.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-foreground-secondary">
                    <Icons.Image className="w-8 h-8 mb-2" />
                    <div className="text-sm">
                        {search ? 'No images or videos match your search' : 'No images or videos in this folder'}
                    </div>
                </div>
            )}
        </div>
    );
};
'use client';

import { useEffect, useRef, useState } from 'react';
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

const INITIAL_LOAD = 20;
const LOAD_MORE_THRESHOLD = 400; // pixels from bottom

export const ImageGrid = ({ images, projectId, branchId, search, onUpload, onRename, onDelete, onAddToChat }: ImageGridProps) => {
    const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const {
        handleDragEnter, handleDragLeave, handleDragOver, handleDrop, isDragging,
        onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp
    } = useImageDragDrop(onUpload);

    // Reset visible count when images change
    useEffect(() => {
        setVisibleCount(INITIAL_LOAD);
    }, [images.length, search]);

    // Load more images as user scrolls
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            if (distanceFromBottom < LOAD_MORE_THRESHOLD && visibleCount < images.length) {
                setVisibleCount(prev => Math.min(prev + INITIAL_LOAD, images.length));
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [visibleCount, images.length]);

    const visibleImages = images.slice(0, visibleCount);

    return (
        <div
            ref={scrollContainerRef}
            className={cn(
                "flex-1 overflow-auto",
                isDragging && 'cursor-copy bg-teal-500/40',
                'h-full'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="grid grid-cols-2 gap-2">
                {visibleImages.map((image) => (
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
                        {search ? 'No images match your search' : 'No images in this folder'}
                    </div>
                </div>
            )}
            {visibleCount < images.length && (
                <div className="flex justify-center py-4 text-xs text-foreground-secondary">
                    Loading more images...
                </div>
            )}
        </div>
    );
};
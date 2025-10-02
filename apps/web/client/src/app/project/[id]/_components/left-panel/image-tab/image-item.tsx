'use client';

import { useFile } from '@onlook/file-system/hooks';
import type { ImageContentData } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useState } from 'react';

interface ImageItemProps {
    image: {
        name: string;
        path: string;
        mimeType?: string;
    };
    rootDir: string;
    onImageDragStart: (e: React.DragEvent<HTMLDivElement>, image: ImageContentData) => void;
    onImageDragEnd: () => void;
    onImageMouseDown: () => void;
    onImageMouseUp: () => void;
}

export const ImageItem = ({ image, rootDir, onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp }: ImageItemProps) => {
    const { content, loading } = useFile(rootDir, image.path);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isDisabled, setIsDisabled] = useState(false);

    // Convert content to data URL for display
    useEffect(() => {
        if (!content) {
            setImageUrl(null);
            return;
        }

        // Handle SVG files (text content)
        if (typeof content === 'string' && image.name.toLowerCase().endsWith('.svg')) {
            // Create data URL for SVG
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(content)}`;
            setImageUrl(svgDataUrl);
            return;
        }

        // Handle other text files (shouldn't happen for images, but just in case)
        if (typeof content === 'string') {
            setImageUrl(null);
            return;
        }

        // Handle binary content (PNG, JPG, etc.)
        const blob = new Blob([content as BlobPart], { type: image.mimeType || 'image/*' });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);

        // Clean up function to revoke object URL (only for blob URLs)
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [content, image.mimeType, image.name]);

    if (loading) {
        return (
            <div className="aspect-square bg-background-secondary rounded-md border border-border-primary flex items-center justify-center">
                <Icons.Reload className="w-4 h-4 animate-spin text-foreground-secondary" />
            </div>
        );
    }

    if (!imageUrl) {
        return (
            <div className="aspect-square bg-background-secondary rounded-md border border-border-primary flex items-center justify-center">
                <Icons.Image className="w-4 h-4 text-foreground-secondary" />
            </div>
        );
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (isDisabled) {
            e.preventDefault();
            return;
        }

        const imageContentData: ImageContentData = {
            fileName: image.name,
            content: content as string,
            mimeType: imageUrl,
            originPath: image.path,
        };
        onImageDragStart(e, imageContentData);
    };

    return (
        <div className="aspect-square bg-background-secondary rounded-md border border-border-primary overflow-hidden cursor-pointer hover:border-border-onlook transition-colors"
            onDragStart={handleDragStart}
            onDragEnd={onImageDragEnd}
            onMouseDown={onImageMouseDown}
            onMouseUp={onImageMouseUp}
        >
            <img
                src={imageUrl}
                alt={image.name}
                className="w-full h-full object-cover"
                loading="lazy"
            />
            <div className="p-1 bg-background-primary/80 backdrop-blur-sm">
                <div className="text-xs text-foreground-primary truncate" title={image.name}>
                    {image.name}
                </div>
            </div>
        </div>
    );
};
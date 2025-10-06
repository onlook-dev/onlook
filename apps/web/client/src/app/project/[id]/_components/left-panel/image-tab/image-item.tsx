'use client';

import { useFile } from '@onlook/file-system/hooks';
import type { ImageContentData } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';

interface ImageItemProps {
    image: {
        name: string;
        path: string;
        mimeType?: string;
    };
    projectId: string;
    branchId: string;
    onImageDragStart: (e: React.DragEvent<HTMLDivElement>, image: ImageContentData) => void;
    onImageDragEnd: () => void;
    onImageMouseDown: () => void;
    onImageMouseUp: () => void;
    onRename: (oldPath: string, newName: string) => Promise<void>;
    onDelete: (filePath: string) => Promise<void>;
    onAddToChat: (image: ImageContentData) => void;
}

export const ImageItem = ({ image, projectId, branchId, onImageDragStart, onImageDragEnd, onImageMouseDown, onImageMouseUp, onRename, onDelete, onAddToChat }: ImageItemProps) => {
    const { content, loading } = useFile(projectId, branchId, image.path);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isDisabled, setIsDisabled] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(image.name);

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

    const handleRename = async () => {
        if (newName.trim() && newName !== image.name) {
            try {
                await onRename(image.path, newName.trim());
            } catch (error) {
                console.error('Failed to rename file:', error);
                setNewName(image.name); // Reset on error
            }
        }
        setIsRenaming(false);
    };

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete ${image.name}?`)) {
            try {
                await onDelete(image.path);
            } catch (error) {
                console.error('Failed to delete file:', error);
            }
        }
    };

    const handleAddToChat = () => {
        const imageContentData: ImageContentData = {
            fileName: image.name,
            content: content as string,
            mimeType: imageUrl || '',
            originPath: image.path,
        };
        onAddToChat(imageContentData);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            void handleRename();
        } else if (e.key === 'Escape') {
            setNewName(image.name);
            setIsRenaming(false);
        }
    };

    return (
        <div className="group">
            <div 
                className="aspect-square bg-background-secondary rounded-md border border-border-primary overflow-hidden cursor-pointer hover:border-border-onlook transition-colors relative"
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
                
                {/* Action menu */}
                {!isRenaming && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-6 w-6 bg-background-secondary/90 hover:bg-background-onlook"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <Icons.DotsHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAddToChat();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Icons.Plus className="h-3 w-3" />
                                    Add to Chat
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsRenaming(true);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Icons.Edit className="h-3 w-3" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        void handleDelete();
                                    }}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-600 focus:text-red-600"
                                >
                                    <Icons.Trash className="h-3 w-3" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
            
            {/* Name section with rename functionality */}
            <div className="mt-1 px-1">
                {isRenaming ? (
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => void handleRename()}
                        className="h-6 text-xs p-1 border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div className="text-xs text-foreground-primary truncate" title={image.name}>
                        {image.name}
                    </div>
                )}
            </div>
        </div>
    );
};
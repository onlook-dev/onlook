'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useDirectory, useFile, useFS } from '@onlook/file-system/hooks';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@onlook/ui/breadcrumb';
import { Button } from '@onlook/ui/button';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { isImageFile } from '@onlook/utility/src/file';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';

// Image component that fetches content using useFile hook
const ImageItem = ({ image, rootDir }: { image: any; rootDir: string }) => {
    const { content, loading } = useFile(rootDir, image.path);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    
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
    
    return (
        <div className="aspect-square bg-background-secondary rounded-md border border-border-primary overflow-hidden cursor-pointer hover:border-border-onlook transition-colors">
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

export const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;

    // State for active folder and search
    const [activeFolder, setActiveFolder] = useState('/public');
    const [search, setSearch] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    
    // File system hook for writing files
    const { fs } = useFS(rootDir);

    // Get directory entries for the root
    const { entries: rootEntries, loading, error } = useDirectory(rootDir, activeFolder);

    // Get available folders
    const folders = useMemo(() => {
        if (!rootEntries) return [];
        return rootEntries.filter(entry => entry.isDirectory);
    }, [rootEntries]);

    // Generate breadcrumb path segments
    const breadcrumbSegments = useMemo(() => {
        const segments = activeFolder.split('/').filter(Boolean);
        return segments.map((segment, index) => {
            const path = '/' + segments.slice(0, index + 1).join('/');
            return { name: segment, path };
        });
    }, [activeFolder]);

    const navigateToFolder = (folderPath: string) => {
        setActiveFolder(folderPath);
        setSearch(''); // Clear search when navigating
    };

    const handleFolderClick = (folder: any) => {
        const newPath = activeFolder === '/' ? `/${folder.name}` : `${activeFolder}/${folder.name}`;
        navigateToFolder(newPath);
    };

    // Handle file upload
    const handleUpload = async (files: FileList) => {
        if (!fs || !files.length) return;
        
        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                // Check if it's an image file
                if (!isImageFile(file.name)) {
                    console.warn(`Skipping non-image file: ${file.name}`);
                    continue;
                }
                
                // Read file content
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                // Create file path in active folder
                const filePath = activeFolder === '/' ? `/${file.name}` : `${activeFolder}/${file.name}`;
                
                // Write file to filesystem
                await fs.writeFile(filePath, uint8Array);
            }
        } catch (error) {
            console.error('Failed to upload files:', error);
            // You could add a toast notification here
        } finally {
            setIsUploading(false);
        }
    };

    // Get images in the active folder
    const { entries: activeFolderEntries } = useDirectory(rootDir, activeFolder);

    const images = useMemo(() => {
        if (!activeFolderEntries) return [];
        return activeFolderEntries
            .filter(entry => !entry.isDirectory && isImageFile(entry.name))
            .filter(image => !search || image.name.toLowerCase().includes(search.toLowerCase()));
    }, [activeFolderEntries, search]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center gap-2">
                <Icons.Reload className="w-4 h-4 animate-spin" />
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center text-sm text-red-500">
                Error: {error.message}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col gap-3 p-3">
            {/* Search and Upload */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        placeholder="Search images..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 text-xs pr-8"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground-primary"
                        >
                            <Icons.CrossS className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="default"
                            size="icon"
                            className="h-8 w-8 text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                            onClick={() => {
                                // Create a file input to handle uploads
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.multiple = true;
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files;
                                    if (files) handleUpload(files);
                                };
                                input.click();
                            }}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Icons.Reload className="w-4 h-4 animate-spin" />
                            ) : (
                                <Icons.Plus className="w-4 h-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Upload image{isUploading ? 's...' : ''}</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
            </div>
            {/* Breadcrumb Navigation */}
            <div className="flex flex-col gap-2">
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbSegments.map((segment, index) => (
                            <>
                                {index !== 0 && <BreadcrumbSeparator className="p-0 m-0">
                                    <Icons.ChevronRight className="w-3 h-3" />
                                </BreadcrumbSeparator>}
                                <BreadcrumbItem key={segment.path}>
                                    <BreadcrumbLink
                                        className={index === breadcrumbSegments.length - 1
                                            ? "text-foreground-primary font-medium"
                                            : "cursor-pointer hover:text-foreground-primary"
                                        }
                                        onClick={() => index !== breadcrumbSegments.length - 1 && navigateToFolder(segment.path)}
                                    >
                                        {segment.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Subfolders */}
            {folders.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-foreground-secondary">
                        Folders
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {folders.map((folder) => (
                            <Button
                                key={folder.path}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleFolderClick(folder)}
                            >
                                <Icons.File className="w-3 h-3 mr-1" />
                                {folder.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Images */}
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
        </div>
    );
});

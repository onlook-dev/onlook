'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useDirectory } from '@onlook/file-system/hooks';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@onlook/ui/breadcrumb';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { isImageFile } from '@onlook/utility/src/file';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

export const ImagesTab = observer(() => {
    const editorEngine = useEditorEngine();
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;

    // State for active folder and search
    const [activeFolder, setActiveFolder] = useState('/public');
    const [search, setSearch] = useState('');

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
            {/* Search */}
            <div className="relative">
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
                        <div
                            key={image.path}
                            className="aspect-square bg-background-secondary rounded-md border border-border-primary overflow-hidden cursor-pointer hover:border-border-onlook transition-colors"
                        >
                            <img
                                src={`/api/project/file?path=${encodeURIComponent(image.path)}`}
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

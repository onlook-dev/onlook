'use client';

import { type ImageContentData } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { useRef, useState, useMemo } from 'react';
import { ImageList } from '../image-list';

interface FolderProps {
    handlers: {
        handleUpload: (files: FileList) => Promise<void>;
        handleRefresh: () => void;
        getImagesInFolder: () => ImageContentData[];
    };
}

const Folder = ({ handlers }: FolderProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState('');
    const [isOperating] = useState(false);

    // Get all images from the active path
    const allImages = handlers.getImagesInFolder();
    
    // Filter images based on search
    const filteredImages = useMemo(() => {
        if (!search.trim()) return allImages;
        return allImages.filter(image => 
            image.fileName.toLowerCase().includes(search.toLowerCase())
        );
    }, [allImages, search]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    const handleSearchClear = () => {
        setSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            inputRef.current?.blur();
        }
    };

    const { handleRefresh, handleUpload } = handlers;
    const isAnyOperationLoading = isOperating;

    return (
        <div className="flex flex-col gap-2 h-full">
            <div className="flex flex-row items-center gap-2 m-0">
                <div className="relative min-w-0 flex-1">
                    <Input
                        ref={inputRef}
                        className="h-8 text-xs pr-8 w-full"
                        placeholder="Search images"
                        value={search}
                        onChange={handleSearchChange}
                        onKeyDown={handleKeyDown}
                        disabled={isAnyOperationLoading}
                    />

                    {search && (
                        <button
                            className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSearchClear}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                        </button>
                    )}
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
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
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.Plus className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Upload an image</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={'default'}
                            size={'icon'}
                            className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                            onClick={handleRefresh}
                            disabled={isAnyOperationLoading}
                        >
                            <Icons.Reload className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>Refresh Images</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
            </div>

            {/* Images Section */}
            <ImageList images={filteredImages} currentFolder="/public" />
        </div>
    );
};

export default Folder;
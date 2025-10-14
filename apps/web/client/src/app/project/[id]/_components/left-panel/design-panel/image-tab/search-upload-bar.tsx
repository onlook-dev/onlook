'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';

interface SearchUploadBarProps {
    search: string;
    setSearch: (value: string) => void;
    isUploading: boolean;
    onUpload: (files: FileList) => Promise<void>;
}

export const SearchUploadBar = ({ search, setSearch, isUploading, onUpload }: SearchUploadBarProps) => {
    const handleUploadClick = () => {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,video/*';
            input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) onUpload(files);
            };
            input.click();
        } catch (error) {
            console.error('Error uploading images and videos', error);
        }
    };

    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Input
                    placeholder="Search images and videos..."
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
                        onClick={handleUploadClick}
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
                        <p>Upload images and videos{isUploading ? '...' : ''}</p>
                    </TooltipContent>
                </TooltipPortal>
            </Tooltip>
        </div>
    );
};
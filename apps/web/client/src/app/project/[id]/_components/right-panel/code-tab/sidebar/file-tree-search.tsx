import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { forwardRef } from 'react';

interface FileTreeSearchProps {
    searchQuery: string;
    isLoading: boolean;
    onSearchChange: (query: string) => void;
    onRefresh?: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

export const FileTreeSearch = forwardRef<HTMLInputElement, FileTreeSearchProps>(({ 
    searchQuery, 
    isLoading, 
    onSearchChange, 
    onRefresh, 
    onKeyDown 
}, ref) => {

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        }
    };

    const clearSearch = () => {
        onSearchChange('');
        if (ref && typeof ref === 'object' && ref.current) {
            ref.current.focus();
        }
    };

    return (
        <div className="p-1.5 flex-shrink-0">
            <div className="flex flex-row justify-between items-center gap-1 mb-2 pb-1.5 border-b-[0.5px] border-border-primary">
                <div className="relative flex-grow">
                    <Input
                        ref={ref}
                        className="h-8 text-small pr-8 focus-visible:ring-1 focus-visible:ring-border-secondary/50 focus-visible:ring-offset-0"
                        placeholder="Search files"
                        value={searchQuery}
                        disabled={isLoading}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    {searchQuery && (
                        <button
                            className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group"
                            onClick={clearSearch}
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
                            className="p-2 w-fit h-8 text-foreground-tertiary hover:text-foreground-hover hover:border-border-onlook bg-background-none hover:bg-background-onlook"
                            disabled={isLoading}
                            onClick={handleRefresh}
                        >
                            {isLoading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-foreground-primary rounded-full border-t-transparent"></div>
                            ) : (
                                <Icons.Reload />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                        <TooltipContent>
                            <p>{isLoading ? 'Loading files...' : 'Refresh files'}</p>
                        </TooltipContent>
                    </TooltipPortal>
                </Tooltip>
            </div>
        </div>
    );
});
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
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
        <div className="h-11 flex flex-row relative flex-shrink-0 justify-between items-center border-border-primary border-b-[0.5px] mb-2">
            <Input
                ref={ref}
                className="m-2 h-8 text-small pr-8 focus-visible:ring-1 focus-visible:ring-border-secondary/50 focus-visible:ring-offset-0"
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
    );
});
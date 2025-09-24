import { useCallback, useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { observer } from 'mobx-react-lite';
import { toast } from 'sonner';

import { VARIANTS } from '@onlook/fonts';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';

import type { FontFile } from './font-files';
import { useEditorEngine } from '@/components/store/editor';
import { FontFamily } from './font-family';
import UploadModal from './upload-modal';

const FontPanel = observer(() => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;

    const handleClose = () => {
        editorEngine.state.brandTab = null;
    };

    const handleUploadFont = () => {
        setIsUploadModalOpen(true);
    };

    const handleFontUpload = async (fonts: FontFile[]) => {
        try {
            const success = await fontManager.uploadFonts(fonts);
            if (success) {
                toast.success('Fonts uploaded successfully');
            } else {
                toast.error('Failed to upload fonts');
            }
            return success;
        } catch (error) {
            console.error('Font upload failed:', error);
            toast.error('Failed to upload fonts', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    };

    const performSearch = useCallback(
        async (value: string) => {
            if (value.length > 0) {
                setIsLoading(true);
                try {
                    await fontManager.searchFonts(value);
                } catch (error) {
                    console.error('Failed to search fonts:', error);
                    toast.error('Failed to search fonts', {
                        description: error instanceof Error ? error.message : 'Unknown error',
                    });
                } finally {
                    setIsLoading(false);
                }
            }
        },
        [fontManager],
    );

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            performSearch(value);
        }, 300),
        [performSearch],
    );

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
        }
    };

    const handleLoadMore = async () => {
        if (isLoading || !fontManager.hasMoreFonts) {
            return;
        }

        setIsLoading(true);
        try {
            await fontManager.fetchNextFontBatch();
        } catch (error) {
            console.error('Failed to load more fonts:', error);
            toast.error('Failed to load more fonts', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const uniqueSiteFonts = searchQuery ? fontManager.searchResults : fontManager.systemFonts;

    return (
        <div className="text-active flex h-full w-full flex-grow flex-col p-0 text-xs">
            {/* Header Section */}
            <div className="border-border flex items-center justify-between border-b py-1.5 pr-2.5 pl-4">
                <h2 className="text-foreground text-sm font-normal">Fonts</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-background-secondary h-7 w-7 rounded-md"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>

            {/* Search Bar - Fixed below header */}
            <div className="border-border border-b px-4 py-3">
                <div className="relative">
                    <Icons.MagnifyingGlass className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 transform" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for a new font..."
                        className="h-9 pr-8 pl-7 text-xs"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {searchQuery && (
                        <button
                            className="hover:bg-background-onlook group absolute top-[1px] right-[1px] bottom-[1px] flex aspect-square items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] active:bg-transparent"
                            onClick={() => handleSearch('')}
                        >
                            <Icons.CrossS className="text-foreground-primary/50 group-hover:text-foreground-primary h-3 w-3" />
                        </button>
                    )}
                    {isLoading && searchQuery && (
                        <div className="absolute top-1/2 right-9 -translate-y-1/2">
                            <Icons.LoadingSpinner className="text-muted-foreground h-4 w-4 animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex flex-1 flex-col overflow-y-auto">
                {/* System Fonts Section */}
                {searchQuery === '' && (
                    <div className="border-border flex flex-col gap-1 border-b pt-6 pb-3">
                        {/* System Fonts Header */}
                        <div className="px-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-muted-foreground text-sm font-normal">
                                    Added fonts
                                </h3>
                                {fontManager.isScanning && (
                                    <Icons.LoadingSpinner className="text-muted-foreground h-3 w-3 animate-spin" />
                                )}
                            </div>
                        </div>

                        {/* System Font List */}
                        <div className="px-4">
                            <div className="divide-border flex flex-col divide-y">
                                {fontManager.isScanning ? (
                                    <div className="border-default my-2 flex h-20 items-center justify-center rounded-lg border-2 border-dashed">
                                        <div className="flex items-center gap-2">
                                            <Icons.LoadingSpinner className="text-muted-foreground h-4 w-4 animate-spin" />
                                            <span className="text-muted-foreground text-sm">
                                                Scanning fonts...
                                            </span>
                                        </div>
                                    </div>
                                ) : !fontManager.fonts.length ? (
                                    <div className="border-default my-2 flex h-20 items-center justify-center rounded-lg border-2 border-dashed">
                                        <span className="text-muted-foreground text-sm">
                                            No fonts added
                                        </span>
                                    </div>
                                ) : (
                                    fontManager.fonts.map((font, index) => (
                                        <div key={`system-${font.family}-${index}`}>
                                            <div className="flex items-center justify-between">
                                                <FontFamily
                                                    name={font.family}
                                                    variants={
                                                        font.weight
                                                            ?.map(
                                                                (weight) =>
                                                                    VARIANTS.find(
                                                                        (v) => v.value === weight,
                                                                    )?.name,
                                                            )
                                                            .filter((v) => v !== undefined) ?? []
                                                    }
                                                    showDropdown={true}
                                                    showAddButton={false}
                                                    isDefault={font.id === fontManager.defaultFont}
                                                    onRemoveFont={() =>
                                                        fontManager.removeFont(font)
                                                    }
                                                    onSetFont={() =>
                                                        fontManager.setDefaultFont(font)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Site Fonts Section */}
                <div className="flex flex-col gap-1 pt-6 pb-4">
                    {/* Site Fonts Header */}
                    <div className="px-4">
                        <h3 className="text-muted-foreground text-sm font-normal">
                            {searchQuery ? 'Search results' : 'Browse new fonts'}
                        </h3>
                    </div>

                    {/* Site Font List */}
                    <div className="px-4">
                        <div className="divide-border flex flex-col divide-y">
                            {uniqueSiteFonts?.length > 0 ? (
                                uniqueSiteFonts.map((font, index) => (
                                    <div key={`${font.family}-${index}`}>
                                        <div className="flex items-center justify-between">
                                            <FontFamily
                                                name={font.family}
                                                variants={
                                                    font.weight
                                                        ?.map(
                                                            (weight) =>
                                                                VARIANTS.find(
                                                                    (v) => v.value === weight,
                                                                )?.name,
                                                        )
                                                        .filter((v) => v !== undefined) ?? []
                                                }
                                                showDropdown={false}
                                                showAddButton={true}
                                                onAddFont={() => fontManager.addFont(font)}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="my-2 flex h-20 items-center justify-center">
                                    <span className="text-muted-foreground text-sm">
                                        No results were found
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Load More Button */}
                        {fontManager.hasMoreFonts && !searchQuery && (
                            <Button
                                variant="ghost"
                                className="text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 mt-4 h-9 w-full rounded-lg border border-white/5 text-sm"
                                onClick={handleLoadMore}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                        <span>Loading...</span>
                                    </div>
                                ) : (
                                    'Load more fonts'
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Button - Fixed at bottom */}
            <div className="border-border mt-auto border-t p-4">
                <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 h-11 w-full rounded-lg border border-white/5 text-sm"
                    onClick={handleUploadFont}
                >
                    Upload a custom font
                </Button>
            </div>

            <UploadModal
                isOpen={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                onUpload={handleFontUpload}
                isUploading={fontManager.isUploading}
            />
        </div>
    );
});

export default FontPanel;

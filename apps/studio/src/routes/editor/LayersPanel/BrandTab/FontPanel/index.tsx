import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { FontFamily } from './FontFamily';
import UploadModal from './UploadModal';
import { useEditorEngine } from '@/components/Context';
import type { FontFile } from './FontFiles';
import { FONT_VARIANTS } from '@onlook/models/constants';

interface FontVariantProps {
    name: string;
    isActive?: boolean;
}

const FontVariant = ({ name, isActive = false }: FontVariantProps) => (
    <div
        className={`py-2 text-sm ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
    >
        {name}
    </div>
);

interface FontPanelProps {
    onClose?: () => void;
}

const FontPanel = observer(({ onClose }: FontPanelProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const editorEngine = useEditorEngine();
    const fontManager = editorEngine.font;

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const handleUploadFont = () => {
        setIsUploadModalOpen(true);
    };

    const handleFontUpload = (fonts: FontFile[]) => {
        fontManager.uploadFonts(fonts);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
        }
    };
    // Filter only site fonts based on search query
    const filteredSiteFonts = fontManager.newFonts.filter(
        (font) =>
            searchQuery === '' || font.family.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    // Deduplicate search results by font name
    const uniqueSiteFonts = searchQuery
        ? filteredSiteFonts.filter(
              (font, index, self) =>
                  index ===
                  self.findIndex((f) => f.family.toLowerCase() === font.family.toLowerCase()),
          )
        : filteredSiteFonts;

    return (
        <div className="flex flex-col h-full text-xs text-active flex-grow w-full p-0">
            {/* Header Section */}
            <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                <h2 className="text-sm font-normal text-foreground">Fonts</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-background-secondary"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>

            {/* Search Bar - Fixed below header */}
            <div className="px-4 py-3 border-b border-border">
                <div className="relative">
                    <Icons.MagnifyingGlass className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for a new font..."
                        className="h-9 text-xs pl-7 pr-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {searchQuery && (
                        <button
                            className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group"
                            onClick={() => setSearchQuery('')}
                        >
                            <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex flex-col flex-1 overflow-y-auto">
                {/* System Fonts Section */}
                {searchQuery === '' && (
                    <div className="flex flex-col gap-1 pt-6 pb-3 border-b border-border">
                        {/* System Fonts Header */}
                        <div className="px-4">
                            <h3 className="text-sm font-normal text-muted-foreground">
                                Added fonts
                            </h3>
                        </div>

                        {/* System Font List */}
                        <div className="px-4">
                            <div className="flex flex-col divide-y divide-border">
                                {fontManager.fonts.map((font, index) => (
                                    <div key={`system-${font.family}-${index}`}>
                                        <div className="flex justify-between items-center">
                                            <FontFamily
                                                name={font.family}
                                                variants={
                                                    font.weight?.map(
                                                        (weight) =>
                                                            FONT_VARIANTS.find(
                                                                (v) => v.value === weight,
                                                            )?.name,
                                                    ) as string[]
                                                }
                                                isLast={index === fontManager.fonts.length - 1}
                                                showDropdown={true}
                                                showAddButton={false}
                                                isDefault={font.id === fontManager.defaultFont}
                                                onRemoveFont={() => fontManager.removeFont(font)}
                                                onSetFont={() => fontManager.setDefaultFont(font)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Site Fonts Section */}
                <div className="flex flex-col gap-1 pt-6 pb-4">
                    {/* Site Fonts Header */}
                    <div className="px-4">
                        <h3 className="text-sm text-muted-foreground font-normal">
                            {searchQuery ? 'Search results' : 'Browse new fonts'}
                        </h3>
                    </div>

                    {/* Site Font List */}
                    <div className="px-4">
                        <div className="flex flex-col divide-y divide-border">
                            {uniqueSiteFonts.map((font, index) => (
                                <div key={`${font.family}-${index}`}>
                                    <div className="flex justify-between items-center">
                                        <FontFamily
                                            name={font.family}
                                            variants={
                                                font.weight?.map(
                                                    (weight) =>
                                                        FONT_VARIANTS.find(
                                                            (v) => v.value === weight,
                                                        )?.name,
                                                ) as string[]
                                            }
                                            isLast={index === uniqueSiteFonts.length - 1}
                                            showDropdown={false}
                                            showAddButton={true}
                                            onAddFont={() => fontManager.addFont(font)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Button - Fixed at bottom */}
            <div className="p-4 border-t border-border mt-auto">
                <Button
                    variant="ghost"
                    className="w-full h-11 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                    onClick={handleUploadFont}
                >
                    Upload a custom font
                </Button>
            </div>

            <UploadModal
                isOpen={isUploadModalOpen}
                onOpenChange={setIsUploadModalOpen}
                onUpload={handleFontUpload}
            />
        </div>
    );
});

export default FontPanel;

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState, useRef } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Input } from '@onlook/ui/input';
import { FontFamily } from './FontFamily';

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

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const handleUploadFont = () => {
        // Implement upload font logic
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
        }
    };

    // Font families data
    const fontFamilies = [
        { name: 'DM Sans', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Creato Display', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Fahkwang', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Roboto', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Times New Roman', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        {
            name: 'Poppins',
            variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'],
        },
        { name: 'Red Rose', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Merriweather', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        {
            name: 'Poppins',
            variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'],
            hasAddButton: true,
        },
        { name: 'Roboto', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Times New Roman', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Red Rose', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
        { name: 'Merriweather', variants: ['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'] },
    ];

    // Filter fonts based on search query
    const filteredFonts = fontFamilies.filter(
        (font) => searchQuery === '' || font.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0">
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
            <div className="px-4 py-3 mb-2 border-b border-border">
                <div className="relative">
                    <Icons.MagnifyingGlass className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search fonts..."
                        className="h-8 text-xs pl-7 pr-8"
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
                <div className="flex flex-col gap-1 py-4 border-b border-border">
                    {/* System Fonts Header */}
                    <div className="px-4">
                        <h3 className="text-sm font-normal">Added fonts</h3>
                    </div>

                    {/* System Font List */}
                    <div className="px-4">
                        <div className="flex flex-col divide-y divide-border">
                            {filteredFonts.slice(0, 4).map((font, index) => (
                                <div key={`system-${font.name}-${index}`}>
                                    <div className="flex justify-between items-center">
                                        <FontFamily
                                            name={font.name}
                                            variants={font.variants}
                                            isLast={index === Math.min(3, filteredFonts.length - 1)}
                                            showDropdown={true}
                                            showAddButton={false}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Site Fonts Section */}
                <div className="flex flex-col gap-1 py-6">
                    {/* Site Fonts Header */}
                    <div className="px-4">
                        <h3 className="text-sm font-normal">Browse new fonts</h3>
                    </div>

                    {/* Site Font List */}
                    <div className="px-4">
                        <div className="flex flex-col divide-y divide-border">
                            {filteredFonts.map((font, index) => (
                                <div key={`${font.name}-${index}`}>
                                    <div className="flex justify-between items-center">
                                        <FontFamily
                                            name={font.name}
                                            variants={font.variants}
                                            isLast={index === filteredFonts.length - 1}
                                            showDropdown={false}
                                            showAddButton={true}
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
                    variant="secondary"
                    className="w-full h-12 text-sm"
                    onClick={handleUploadFont}
                >
                    Upload a custom font
                </Button>
            </div>
        </div>
    );
});

export default FontPanel;

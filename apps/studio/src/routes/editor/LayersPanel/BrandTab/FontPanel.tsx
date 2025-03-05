import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
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

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const handleUploadFont = () => {
        // Implement upload font logic
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
        <div className="flex flex-col h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0">
            {/* Header Section */}
            <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                <h2 className="text-base font-normal text-foreground">Font Management</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-background-secondary"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3">
                <div className="relative">
                    <Icons.MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search fonts..."
                        className="pl-9 bg-background-secondary border-none h-10 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Site Fonts Header */}
            <div className="px-4 py-2">
                <h3 className="text-base font-medium">Site fonts</h3>
            </div>

            {/* Font List */}
            <div className="flex-1 overflow-y-auto px-4">
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

            {/* Upload Button */}
            <div className="p-4 border-t border-border">
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

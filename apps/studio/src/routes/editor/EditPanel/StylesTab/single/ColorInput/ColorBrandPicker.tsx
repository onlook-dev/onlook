import { useEditorEngine } from '@/components/Context';
import type { CompoundStyle } from '@/lib/editor/styles/models';
import type { ColorItem } from '@/routes/editor/LayersPanel/BrandTab/ColorPanel/ColorPalletGroup';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Color } from '@onlook/utility';
import { memo, useEffect, useRef, useState } from 'react';
import { isBackgroundImageEmpty } from '.';
import ColorButton from './ColorButton';
import ColorPickerContent from './ColorPicker';
import ImagePickerContent from './ImagePicker';

interface ColorBrandPickerProps {
    color: Color;
    onChange: (color: Color | ColorItem) => void;
    onChangeEnd: (color: Color | ColorItem) => void;
    backgroundImage?: string;
    compoundStyle?: CompoundStyle;
}

enum TabValue {
    BRAND = 'brand',
    CUSTOM = 'custom',
    IMAGE = 'image',
}

const ColorGroup = ({
    name,
    colors,
    onColorSelect,
    isDefault = false,
}: {
    name: string;
    colors: ColorItem[];
    onColorSelect: (colorKey: ColorItem) => void;
    isDefault?: boolean;
}) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="w-full group">
            <button
                aria-label={`Toggle ${expanded ? 'closed' : 'open'}`}
                className="rounded flex items-center p-1 w-full"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-1  flex-1">
                    <span className="text-xs font-normal capitalize">{name}</span>
                    {isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">Default</span>
                    )}
                </div>
                {expanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
            </button>

            {expanded &&
                colors.map((color) => (
                    <div
                        key={color.name}
                        className="flex items-center gap-1.5 hover:bg-background-secondary rounded-md p-1 hover:cursor-pointer"
                        onClick={() => onColorSelect(color)}
                    >
                        <div
                            className="w-5 h-5 rounded-sm"
                            style={{ backgroundColor: color.lightColor }}
                        />
                        <span className="text-xs font-normal truncate max-w-32">{color.name}</span>
                    </div>
                ))}
        </div>
    );
};

export const BrandPopoverPicker = memo(
    ({ color, onChange, onChangeEnd, backgroundImage, compoundStyle }: ColorBrandPickerProps) => {
        const editorEngine = useEditorEngine();
        const [isOpen, toggleOpen] = useState(false);
        const defaultValue =
            backgroundImage && !isBackgroundImageEmpty(backgroundImage)
                ? TabValue.IMAGE
                : TabValue.BRAND;
        const [searchQuery, setSearchQuery] = useState('');
        const inputRef = useRef<HTMLInputElement>(null);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setSearchQuery('');
            }
            if (e.key === 'Escape') {
                setSearchQuery('');
                inputRef.current?.blur();
            }
        };

        const filteredColorGroups = Object.entries(editorEngine.theme.colorGroups).filter(
            ([name, colors]) => {
                return colors.some((color) =>
                    color.name.toLowerCase().includes(searchQuery.toLowerCase()),
                );
            },
        );

        const filteredColorDefaults = Object.entries(editorEngine.theme.colorDefaults).filter(
            ([name, colors]) => {
                return colors.some((color) =>
                    color.name.toLowerCase().includes(searchQuery.toLowerCase()),
                );
            },
        );

        const handleColorSelect = (color: ColorItem) => {
            onChangeEnd?.(color);
        };

        useEffect(() => {
            if (isOpen && !editorEngine.history.isInTransaction) {
                editorEngine.history.startTransaction();
                return;
            }

            if (!isOpen && editorEngine.history.isInTransaction) {
                editorEngine.history.commitTransaction();
            }
            return () => editorEngine.history.commitTransaction();
        }, [isOpen]);

        return (
            <Popover onOpenChange={(open) => toggleOpen(open)}>
                <PopoverTrigger>
                    <ColorButton value={color} onClick={() => toggleOpen(!isOpen)} />
                </PopoverTrigger>
                <PopoverContent
                    className="backdrop-blur-lg z-10 rounded-lg p-0 shadow-xl overflow-hidden w-56"
                    side="left"
                    align="start"
                >
                    <div>
                        <Tabs defaultValue={defaultValue} className="bg-transparent pb-0">
                            <TabsList className="bg-transparent px-2 m-0 gap-2">
                                <TabsTrigger
                                    value={TabValue.BRAND}
                                    className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                                >
                                    Brand
                                </TabsTrigger>
                                <TabsTrigger
                                    value={TabValue.CUSTOM}
                                    className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                                >
                                    Custom
                                </TabsTrigger>
                                <TabsTrigger
                                    value={TabValue.IMAGE}
                                    className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                                >
                                    Image
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value={TabValue.BRAND} className="p-0 m-0 text-xs">
                                <div className="border-b border-t">
                                    <div className="relative">
                                        <Icons.MagnifyingGlass className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="Search colors"
                                            className="text-xs pl-7 pr-8 rounded-none border-none"
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
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-96 p-2">
                                    {filteredColorGroups.map(([name, colors]) => (
                                        <ColorGroup
                                            key={name}
                                            name={name}
                                            colors={colors}
                                            onColorSelect={handleColorSelect}
                                        />
                                    ))}
                                    {filteredColorDefaults.map(([name, colors]) => (
                                        <ColorGroup
                                            key={name}
                                            name={name}
                                            colors={colors}
                                            onColorSelect={handleColorSelect}
                                            isDefault={true}
                                        />
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value={TabValue.CUSTOM} className="p-0 m-0">
                                <ColorPickerContent
                                    color={color}
                                    onChange={onChange}
                                    onChangeEnd={onChangeEnd}
                                />
                            </TabsContent>
                            <TabsContent value={TabValue.IMAGE} className="p-0 m-0">
                                <ImagePickerContent
                                    compoundStyle={compoundStyle}
                                    backgroundImage={backgroundImage}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </PopoverContent>
            </Popover>
        );
    },
);

BrandPopoverPicker.displayName = 'BrandPopoverPicker';

import { useEditorEngine } from '@/components/store/editor';
import { SystemTheme } from '@onlook/models/assets';
import type { TailwindColor } from '@onlook/models/style';
import { ColorPicker } from '@onlook/ui/color-picker';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Color, toNormalCase, type Palette } from '@onlook/utility';
import { useEffect, useRef, useState } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';


const ColorGroup = ({
    name,
    colors,
    onColorSelect,
    isDefault = false,
    isExpanded = true,
    selectedColor,
}: {
    name: string;
    colors: TailwindColor[];
    onColorSelect: (color: TailwindColor) => void;
    isDefault?: boolean;
    isExpanded?: boolean;
    selectedColor?: Color;
}) => {
    const [expanded, setExpanded] = useState(true);
    const selectedRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setExpanded(isExpanded);
    }, [isExpanded]);

    useEffect(() => {
        setTimeout(() => {
            if (selectedRef.current) {
                selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }, [selectedColor, expanded]);

    return (
        <div className="w-full group">
            <button
                aria-label={`Toggle ${expanded ? 'closed' : 'open'}`}
                className="sticky top-0 z-10 bg-background rounded flex items-center p-1 w-full"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs font-normal capitalize">{toNormalCase(name)}</span>
                    {isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">Default</span>
                    )}
                </div>
                {expanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
            </button>

            {expanded &&
                colors.map((color) => {
                    const isSelected = selectedColor && Color.from(color.lightColor).isEqual(selectedColor);

                    return (
                        <div
                            key={color.name}
                            ref={isSelected ? selectedRef : undefined}
                            className={`flex items-center gap-1.5 rounded-md p-1 hover:bg-background-secondary hover:cursor-pointer 
                                ${isSelected ? 'bg-background-tertiary' : ''}`}
                            onClick={() => onColorSelect(color)}
                        >
                            <div
                                className="w-5 h-5 rounded-sm"
                                style={{ backgroundColor: color.lightColor }}
                            />
                            <span className="text-xs font-normal truncate max-w-32">
                                {toNormalCase(color.name)}
                            </span>
                            {isSelected && (
                                <Icons.CheckCircled className="ml-auto text-primary w-4 h-4" />
                            )}
                        </div>
                    );
                })}
        </div>
    );
};

enum TabValue {
    BRAND = 'brand',
    CUSTOM = 'custom',
}

interface ColorPickerProps {
    color: Color;
    onChange: (color: Color | TailwindColor) => void;
    onChangeEnd: (color: Color | TailwindColor) => void;
}

export const ColorPickerContent: React.FC<ColorPickerProps> = ({
    color,
    onChange,
    onChangeEnd,
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [palette, setPalette] = useState<Palette>(color.palette);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const editorEngine = useEditorEngine();
    const [colorGroups, setColorGroups] = useState<Record<string, TailwindColor[]>>({});
    const [colorDefaults, setColorDefaults] = useState<Record<string, TailwindColor[]>>({});
    const [theme] = useState<SystemTheme>(SystemTheme.LIGHT);

    useEffect(() => {
        setPalette(color.palette);
    }, [color]);

    useEffect(() => {
        (async () => {
            try {
                await editorEngine.theme.scanConfig()
                setColorGroups(editorEngine.theme.colorGroups);
                setColorDefaults(editorEngine.theme.colorDefaults);
            } catch (error) {
                console.error('Failed to scan fonts:', error);
            }
        })();
    }, []);

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

    const filteredColorGroups = Object.entries(colorGroups).filter(
        ([name, colors]) => {
            const query = searchQuery.toLowerCase();
            return (
                name.toLowerCase().includes(query) ||
                colors.some((color) => color.name.toLowerCase().includes(query))
            );
        },
    );

    const filteredColorDefaults = Object.entries(colorDefaults).filter(
        ([name, colors]) => {
            const query = searchQuery.toLowerCase();
            return (
                name.toLowerCase().includes(query) ||
                colors.some((color) => color.name.toLowerCase().includes(query))
            );
        },
    );

    const handleColorSelect = (colorItem: TailwindColor) => {
        onChangeEnd(colorItem);
    };

    const handleRemoveColor = () => {
        const removeColorAction: TailwindColor = {
            name: 'remove',
            originalKey: '',
            lightColor: '',
            darkColor: '',
        };
        onChangeEnd(removeColorAction);
    };
    
    const isColorRemoved = (colorToCheck: Color) => colorToCheck.isEqual(Color.from('transparent'));

    function renderPalette() {
        const colors = Object.keys(palette.colors);
        return (
            <div className="px-0.5 py-1">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-7 gap-1.5 p-1 text-center justify-between">
                        {colors.map((level) => (
                            <div
                                key={level}
                                className="w-6 h-6 content-center cursor-pointer rounded border-[0.5px] border-foreground-tertiary/50"
                                style={{ backgroundColor: palette.colors[Number.parseInt(level)] }}
                                onClick={() =>
                                    onChangeEnd(
                                        Color.from(
                                            palette.colors[Number.parseInt(level)] ?? '#000000',
                                        ),
                                    )
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {colors.map((level) => (
                            <div
                                className="gap-2 hover:bg-background-secondary p-1 flex align-center cursor-pointer rounded-md group"
                                key={level}
                                onClick={() =>
                                    onChangeEnd(
                                        Color.from(
                                            palette.colors[Number.parseInt(level)] ?? '#000000',
                                        ),
                                    )
                                }
                            >
                                <div
                                    key={level}
                                    className="w-5 h-5 content-center rounded border-[0.5px] border-foreground-tertiary/50"
                                    style={{
                                        backgroundColor: palette.colors[Number.parseInt(level)],
                                    }}
                                />
                                <div className="text-small text-foreground-secondary group-hover:text-foreground-primary">
                                    <span>
                                        {palette.name}-{level}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-between items-center">
            <Tabs defaultValue={TabValue.BRAND} className="w-full">
                <TabsList className="bg-transparent px-2 m-0 gap-2 justify-between w-full">
                    <div className="flex gap-2">
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
                    </div>


                    <HoverOnlyTooltip
                        content="Remove Background Color"
                        side="bottom"
                        className="mt-1"
                        hideArrow
                        disabled={isColorRemoved(color)}
                    >
                        <button
                            className={`p-1 rounded transition-colors ${
                                isColorRemoved(color) 
                                    ? 'bg-background-secondary' 
                                    : 'hover:bg-background-tertiary'
                            }`}
                            onClick={handleRemoveColor}
                        >
                            <Icons.SquareX 
                                className={`h-4 w-4 ${
                                    isColorRemoved(color) 
                                        ? 'text-foreground-primary' 
                                        : 'text-foreground-tertiary'
                                }`} 
                            />
                        </button>
                    </HoverOnlyTooltip>

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
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-96 px-2 mt-2">
                        {filteredColorGroups.map(([name, colors]) => (
                            <ColorGroup
                                key={name}
                                name={name}
                                colors={colors}
                                onColorSelect={handleColorSelect}
                                selectedColor={color}
                            />
                        ))}
                        {filteredColorDefaults.map(([name, colors]) => (
                            <ColorGroup
                                key={name}
                                name={name}
                                colors={colors}
                                onColorSelect={handleColorSelect}
                                isDefault
                                selectedColor={color}
                            />
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value={TabValue.CUSTOM} className="p-0 m-0">
                    <ColorPicker
                        color={color}
                        onChange={onChange}
                        onChangeEnd={(val) => {
                            onChangeEnd?.(val);
                            setPalette(val.palette);
                        }}
                    />
                    <Separator />
                    <div className="flex flex-row items-center justify-between w-full px-2 py-1">
                        <span className="text-foreground-secondary text-small">{palette.name}</span>
                        <button
                            aria-label={`Toggle ${viewMode === 'grid' ? 'list' : 'grid'} mode`}
                            className="text-foreground-tertiary hover:text-foreground-hover rounded"
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        >
                            {viewMode === 'grid' ? (
                                <Icons.ViewGrid className="h-4 w-4" />
                            ) : (
                                <Icons.ViewHorizontal className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <Separator />
                    <div className="h-28 px-1 overflow-hidden overflow-y-auto">{renderPalette()}</div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

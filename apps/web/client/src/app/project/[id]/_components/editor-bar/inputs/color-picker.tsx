import { useEditorEngine } from '@/components/store/editor';
import { SystemTheme } from '@onlook/models/assets';
import type { TailwindColor } from '@onlook/models/style';
import { ColorPicker, Gradient, type GradientState, type GradientStop } from '@onlook/ui/color-picker';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { Color, toNormalCase, type Palette } from '@onlook/utility';
import { useEffect, useRef, useState, useCallback } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { useGradientUpdate } from '../hooks/use-gradient-update';


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
    GRADIENT = 'gradient'
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
    const { handleGradientUpdateEnd } = useGradientUpdate();
    
    // Gradient controller state
    const [gradientState, setGradientState] = useState<GradientState>({
        type: 'linear',
        angle: 90,
        stops: [
            { id: 'stop-1', color: '#ff6b6b', position: 0 },
            { id: 'stop-2', color: '#feca57', position: 100 }
        ]
    });
    const [selectedStopId, setSelectedStopId] = useState<string>('stop-1');

    // Preset gradients - enough to fill the grid nicely
    const presetGradients = [
        { id: 'sunset', css: 'linear-gradient(45deg, #ff6b6b, #feca57)', stops: [{ id: '1', color: '#ff6b6b', position: 0 }, { id: '2', color: '#feca57', position: 100 }] },
        { id: 'ocean', css: 'linear-gradient(45deg, #48cae4, #023e8a)', stops: [{ id: '1', color: '#48cae4', position: 0 }, { id: '2', color: '#023e8a', position: 100 }] },
        { id: 'purple-pink', css: 'linear-gradient(45deg, #f72585, #b5179e)', stops: [{ id: '1', color: '#f72585', position: 0 }, { id: '2', color: '#b5179e', position: 100 }] },
        { id: 'blue-purple', css: 'linear-gradient(90deg, #667eea, #764ba2)', stops: [{ id: '1', color: '#667eea', position: 0 }, { id: '2', color: '#764ba2', position: 100 }] },
        { id: 'pink-red', css: 'linear-gradient(135deg, #f093fb, #f5576c)', stops: [{ id: '1', color: '#f093fb', position: 0 }, { id: '2', color: '#f5576c', position: 100 }] },
        { id: 'cyan-blue', css: 'linear-gradient(180deg, #4facfe, #00f2fe)', stops: [{ id: '1', color: '#4facfe', position: 0 }, { id: '2', color: '#00f2fe', position: 100 }] },
        { id: 'green-teal', css: 'linear-gradient(45deg, #11998e, #38ef7d)', stops: [{ id: '1', color: '#11998e', position: 0 }, { id: '2', color: '#38ef7d', position: 100 }] },
        { id: 'purple-deep', css: 'linear-gradient(90deg, #8360c3, #2ebf91)', stops: [{ id: '1', color: '#8360c3', position: 0 }, { id: '2', color: '#2ebf91', position: 100 }] },
        { id: 'orange-coral', css: 'linear-gradient(135deg, #ff9a9e, #fecfef)', stops: [{ id: '1', color: '#ff9a9e', position: 0 }, { id: '2', color: '#fecfef', position: 100 }] },
        { id: 'blue-sky', css: 'linear-gradient(45deg, #74b9ff, #0984e3)', stops: [{ id: '1', color: '#74b9ff', position: 0 }, { id: '2', color: '#0984e3', position: 100 }] },
        { id: 'mint-fresh', css: 'linear-gradient(90deg, #a8edea, #fed6e3)', stops: [{ id: '1', color: '#a8edea', position: 0 }, { id: '2', color: '#fed6e3', position: 100 }] },
        { id: 'warm-flame', css: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', stops: [{ id: '1', color: '#ff9a9e', position: 0 }, { id: '2', color: '#fad0c4', position: 100 }] },
        { id: 'night-fade', css: 'linear-gradient(180deg, #a18cd1, #fbc2eb)', stops: [{ id: '1', color: '#a18cd1', position: 0 }, { id: '2', color: '#fbc2eb', position: 100 }] },
        { id: 'spring-warmth', css: 'linear-gradient(45deg, #fad0c4, #ffd1ff)', stops: [{ id: '1', color: '#fad0c4', position: 0 }, { id: '2', color: '#ffd1ff', position: 100 }] },
        { id: 'juicy-peach', css: 'linear-gradient(90deg, #ffecd2, #fcb69f)', stops: [{ id: '1', color: '#ffecd2', position: 0 }, { id: '2', color: '#fcb69f', position: 100 }] },
        { id: 'young-passion', css: 'linear-gradient(135deg, #ff8177, #ff867a)', stops: [{ id: '1', color: '#ff8177', position: 0 }, { id: '2', color: '#ff867a', position: 100 }] },
        { id: 'lady-lips', css: 'linear-gradient(180deg, #ff9a9e, #f687b3)', stops: [{ id: '1', color: '#ff9a9e', position: 0 }, { id: '2', color: '#f687b3', position: 100 }] },
        { id: 'sunny-morning', css: 'linear-gradient(45deg, #f6d365, #fda085)', stops: [{ id: '1', color: '#f6d365', position: 0 }, { id: '2', color: '#fda085', position: 100 }] },
        { id: 'rainy-ashville', css: 'linear-gradient(90deg, #fbc2eb, #a6c1ee)', stops: [{ id: '1', color: '#fbc2eb', position: 0 }, { id: '2', color: '#a6c1ee', position: 100 }] },
        { id: 'frozen-dreams', css: 'linear-gradient(135deg, #fdcbf1, #e6dee9)', stops: [{ id: '1', color: '#fdcbf1', position: 0 }, { id: '2', color: '#e6dee9', position: 100 }] },
        { id: 'winter-neva', css: 'linear-gradient(180deg, #a8edea, #fed6e3)', stops: [{ id: '1', color: '#a8edea', position: 0 }, { id: '2', color: '#fed6e3', position: 100 }] },
    ];

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

    // Gradient controller handlers
    const handleGradientChange = useCallback((newGradient: GradientState) => {
        setGradientState(newGradient);
        
        // Generate CSS based on gradient type and apply
        const sortedStops = [...newGradient.stops].sort((a, b) => a.position - b.position);
        const stopStrings = sortedStops.map(stop => `${stop.color} ${stop.position}%`);
        
        let cssValue: string;
        switch (newGradient.type) {
            case 'radial':
                cssValue = `radial-gradient(circle, ${stopStrings.join(', ')})`;
                break;
            case 'conic':
                cssValue = `conic-gradient(from ${newGradient.angle}deg, ${stopStrings.join(', ')})`;
                break;
            default:
                cssValue = `linear-gradient(${newGradient.angle}deg, ${stopStrings.join(', ')})`;
        }
        
        // Apply via the existing gradient update system
        handleGradientUpdateEnd({
            id: 'current-gradient',
            name: 'Current Gradient',
            direction: `${newGradient.angle}deg`,
            stops: newGradient.stops.map(s => ({ color: s.color, position: s.position })),
            cssValue
        });
    }, [handleGradientUpdateEnd]);

    const handleStopColorChange = useCallback((stopId: string, newColor: Color) => {
        try {
            const updatedGradient = {
                ...gradientState,
                stops: gradientState.stops.map(stop =>
                    stop.id === stopId
                        ? { ...stop, color: newColor.toHex() }
                        : stop
                )
            };
            setGradientState(updatedGradient);
            handleGradientChange(updatedGradient);
        } catch (error) {
            console.error('Error updating stop color:', error);
        }
    }, [gradientState, handleGradientChange]);

    const handleStopSelect = useCallback((stopId: string) => {
        setSelectedStopId(stopId);
        // Update the color picker to show the selected stop's color
        const selectedStop = gradientState.stops.find(s => s.id === stopId);
        if (selectedStop) {
            const stopColor = Color.from(selectedStop.color);
            onChange(stopColor);
        }
    }, [gradientState.stops, onChange]);

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

    function renderPresets() {
        return (
            <div className="px-0.5 py-1">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-7 gap-1.5 p-1 text-center justify-between">
                        {presetGradients.map((preset) => (
                            <div
                                key={preset.id}
                                className="w-6 h-6 content-center cursor-pointer rounded border-[0.5px] border-foreground-tertiary/50"
                                style={{ background: preset.css }}
                                onClick={() => {
                                    try {
                                        const newGradientState: GradientState = {
                                            type: 'linear',
                                            angle: parseInt(preset.css.match(/(\d+)deg/)?.[1] || '90'),
                                            stops: preset.stops.map((stop, index) => ({
                                                id: `stop-${index + 1}`,
                                                color: stop.color,
                                                position: stop.position
                                            }))
                                        };
                                        setGradientState(newGradientState);
                                        setSelectedStopId('stop-1');
                                        handleGradientChange(newGradientState);
                                        
                                        // Update the color picker to show the first stop's color
                                        const firstStop = newGradientState.stops[0];
                                        if (firstStop) {
                                            onChange(Color.from(firstStop.color));
                                        }
                                    } catch (error) {
                                        console.error('Error applying preset gradient:', error);
                                    }
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {presetGradients.map((preset) => (
                            <div
                                className="gap-2 hover:bg-background-secondary p-1 flex align-center cursor-pointer rounded-md group"
                                key={preset.id}
                                onClick={() => {
                                    try {
                                        const newGradientState: GradientState = {
                                            type: 'linear',
                                            angle: parseInt(preset.css.match(/(\d+)deg/)?.[1] || '90'),
                                            stops: preset.stops.map((stop, index) => ({
                                                id: `stop-${index + 1}`,
                                                color: stop.color,
                                                position: stop.position
                                            }))
                                        };
                                        setGradientState(newGradientState);
                                        setSelectedStopId('stop-1');
                                        handleGradientChange(newGradientState);
                                        
                                        // Update the color picker to show the first stop's color
                                        const firstStop = newGradientState.stops[0];
                                        if (firstStop) {
                                            onChange(Color.from(firstStop.color));
                                        }
                                    } catch (error) {
                                        console.error('Error applying preset gradient:', error);
                                    }
                                }}
                            >
                                <div
                                    key={preset.id}
                                    className="w-5 h-5 content-center rounded border-[0.5px] border-foreground-tertiary/50"
                                    style={{ background: preset.css }}
                                />
                                <div className="text-small text-foreground-secondary group-hover:text-foreground-primary">
                                    <span>{preset.id}</span>
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
                        <TabsTrigger
                            value={TabValue.GRADIENT}
                            className="bg-transparent text-xs p-1 hover:text-foreground-primary"
                        >
                            Gradient
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
                <TabsContent value={TabValue.GRADIENT} className="p-0 m-0">
                    {/* Color Picker for selected stop */}
                    {selectedStopId && (
                        <>
                            <ColorPicker
                                color={color}
                                onChange={(newColor) => {
                                    onChange(newColor);
                                    if (selectedStopId) {
                                        handleStopColorChange(selectedStopId, newColor);
                                    }
                                }}
                                onChangeEnd={(val) => {
                                    onChangeEnd?.(val);
                                    setPalette(val.palette);
                                    if (selectedStopId) {
                                        handleStopColorChange(selectedStopId, val);
                                    }
                                }}
                            />
                            <Separator />
                        </>
                    )}
                    
                    {/* Gradient Controller */}
                    <Gradient
                        gradient={gradientState}
                        onGradientChange={handleGradientChange}
                        onStopColorChange={handleStopColorChange}
                        onStopSelect={handleStopSelect}
                        selectedStopId={selectedStopId}
                        className="border-b border-border"
                        showPresets={false}
                    />
                    
                    {/* Preset Gradients */}
                    <div className="flex flex-row items-center justify-between w-full px-2 py-1">
                        <span className="text-foreground-secondary text-small">Presets</span>
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
                    <div className="h-28 px-1 overflow-hidden overflow-y-auto">{renderPresets()}</div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

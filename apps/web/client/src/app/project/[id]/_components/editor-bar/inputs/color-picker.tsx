import { useEditorEngine } from '@/components/store/editor';
import { SystemTheme } from '@onlook/models/assets';
import type { TailwindColor } from '@onlook/models/style';
import {
    ColorPicker,
    Gradient,
    type GradientState
} from '@onlook/ui/color-picker';
import { parseGradientFromCSS } from '@onlook/ui/color-picker/Gradient';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { Color, toNormalCase, type Palette } from '@onlook/utility';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGradientUpdate } from '../hooks/use-gradient-update';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { hasGradient } from '../utils/gradient';

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
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({ block: 'center' });
        }
    }, [expanded]);

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
                    const isSelected =
                        selectedColor && Color.from(color.lightColor).isEqual(selectedColor);

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
    GRADIENT = 'gradient',
}

interface ColorPickerProps {
    color: Color;
    onChange: (color: Color | TailwindColor) => void;
    onChangeEnd: (color: Color | TailwindColor) => void;
    backgroundImage?: string;
    isCreatingNewColor?: boolean;
    hideGradient?: boolean;
}

export const ColorPickerContent: React.FC<ColorPickerProps> = ({
    color,
    onChange,
    onChangeEnd,
    backgroundImage,
    isCreatingNewColor,
    hideGradient = false,
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

    const [gradientState, setGradientState] = useState<GradientState>({
        type: 'linear',
        angle: 90,
        stops: [
            { id: 'stop-1', color: '#ff6b6b', position: 0, opacity: 100 },
            { id: 'stop-2', color: '#feca57', position: 100, opacity: 100 },
        ],
    });
    const [selectedStopId, setSelectedStopId] = useState<string>('stop-1');
    const [activeTab, setActiveTab] = useState<TabValue>(
        isCreatingNewColor ? TabValue.CUSTOM : TabValue.BRAND,
    );


    const isColorRemoved = (colorToCheck: Color) => colorToCheck.isEqual(Color.from('transparent'));

    interface PresetGradient {
        id: string;
        css: string;
        type: GradientState['type'];
        stops: Array<{ id: string; color: string; position: number; opacity?: number }>;
    }

    const presetGradients: PresetGradient[] = [
        {
            id: 'sunset',
            css: 'linear-gradient(45deg, #ff6b6b, #feca57)',
            type: 'linear',
            stops: [
                { id: '1', color: '#ff6b6b', position: 0, opacity: 100 },
                { id: '2', color: '#feca57', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'ocean',
            css: 'linear-gradient(45deg, #48cae4, #023e8a)',
            type: 'linear',
            stops: [
                { id: '1', color: '#48cae4', position: 0, opacity: 100 },
                { id: '2', color: '#023e8a', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'purple-pink',
            css: 'linear-gradient(45deg, #f72585, #b5179e)',
            type: 'linear',
            stops: [
                { id: '1', color: '#f72585', position: 0, opacity: 100 },
                { id: '2', color: '#b5179e', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'blue-purple',
            css: 'linear-gradient(90deg, #667eea, #764ba2)',
            type: 'linear',
            stops: [
                { id: '1', color: '#667eea', position: 0, opacity: 100 },
                { id: '2', color: '#764ba2', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'pink-red',
            css: 'linear-gradient(135deg, #f093fb, #f5576c)',
            type: 'linear',
            stops: [
                { id: '1', color: '#f093fb', position: 0, opacity: 100 },
                { id: '2', color: '#f5576c', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'cyan-blue',
            css: 'linear-gradient(180deg, #4facfe, #00f2fe)',
            type: 'linear',
            stops: [
                { id: '1', color: '#4facfe', position: 0, opacity: 100 },
                { id: '2', color: '#00f2fe', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'angular-sunset',
            css: 'conic-gradient(from 0deg, #ff9a9e, #fecfef, #fecfef)',
            type: 'angular',
            stops: [
                { id: '1', color: '#ff9a9e', position: 0, opacity: 100 },
                { id: '2', color: '#fecfef', position: 50, opacity: 100 },
                { id: '3', color: '#fecfef', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'diamond-mint',
            css: 'radial-gradient(ellipse 80% 80% at center, #a8edea, #fed6e3)',
            type: 'diamond',
            stops: [
                { id: '1', color: '#a8edea', position: 0, opacity: 100 },
                { id: '2', color: '#fed6e3', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'radial-sunset',
            css: 'radial-gradient(circle, #ff6b6b, #feca57)',
            type: 'radial',
            stops: [
                { id: '1', color: '#ff6b6b', position: 0, opacity: 100 },
                { id: '2', color: '#feca57', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'conic-rainbow',
            css: 'conic-gradient(from 0deg, #ff6b6b, #feca57, #48cae4, #ff6b6b)',
            type: 'conic',
            stops: [
                { id: '1', color: '#ff6b6b', position: 0, opacity: 100 },
                { id: '2', color: '#feca57', position: 33, opacity: 100 },
                { id: '3', color: '#48cae4', position: 66, opacity: 100 },
                { id: '4', color: '#ff6b6b', position: 100, opacity: 100 },
            ],
        },
        {
            id: 'green-teal',
            css: 'linear-gradient(45deg, #11998e, #38ef7d)',
            type: 'linear',
            stops: [
                { id: '1', color: '#11998e', position: 0 },
                { id: '2', color: '#38ef7d', position: 100 },
            ],
        },
        {
            id: 'purple-deep',
            css: 'linear-gradient(90deg, #8360c3, #2ebf91)',
            type: 'linear',
            stops: [
                { id: '1', color: '#8360c3', position: 0 },
                { id: '2', color: '#2ebf91', position: 100 },
            ],
        },
        {
            id: 'orange-coral',
            css: 'linear-gradient(135deg, #ff9a9e, #fecfef)',
            type: 'linear',
            stops: [
                { id: '1', color: '#ff9a9e', position: 0 },
                { id: '2', color: '#fecfef', position: 100 },
            ],
        },
        {
            id: 'blue-sky',
            css: 'linear-gradient(45deg, #74b9ff, #0984e3)',
            type: 'linear',
            stops: [
                { id: '1', color: '#74b9ff', position: 0 },
                { id: '2', color: '#0984e3', position: 100 },
            ],
        },
        {
            id: 'mint-fresh',
            css: 'linear-gradient(90deg, #a8edea, #fed6e3)',
            type: 'linear',
            stops: [
                { id: '1', color: '#a8edea', position: 0 },
                { id: '2', color: '#fed6e3', position: 100 },
            ],
        },
        {
            id: 'warm-flame',
            css: 'linear-gradient(135deg, #ff9a9e, #fad0c4)',
            type: 'linear',
            stops: [
                { id: '1', color: '#ff9a9e', position: 0 },
                { id: '2', color: '#fad0c4', position: 100 },
            ],
        },
        {
            id: 'night-fade',
            css: 'linear-gradient(180deg, #a18cd1, #fbc2eb)',
            type: 'linear',
            stops: [
                { id: '1', color: '#a18cd1', position: 0 },
                { id: '2', color: '#fbc2eb', position: 100 },
            ],
        },
        {
            id: 'spring-warmth',
            css: 'linear-gradient(45deg, #fad0c4, #ffd1ff)',
            type: 'linear',
            stops: [
                { id: '1', color: '#fad0c4', position: 0 },
                { id: '2', color: '#ffd1ff', position: 100 },
            ],
        },
        {
            id: 'juicy-peach',
            css: 'linear-gradient(90deg, #ffecd2, #fcb69f)',
            type: 'linear',
            stops: [
                { id: '1', color: '#ffecd2', position: 0 },
                { id: '2', color: '#fcb69f', position: 100 },
            ],
        },
        {
            id: 'young-passion',
            css: 'linear-gradient(135deg, #ff8177, #ff867a)',
            type: 'linear',
            stops: [
                { id: '1', color: '#ff8177', position: 0 },
                { id: '2', color: '#ff867a', position: 100 },
            ],
        },
        {
            id: 'lady-lips',
            css: 'linear-gradient(180deg, #ff9a9e, #f687b3)',
            type: 'linear',
            stops: [
                { id: '1', color: '#ff9a9e', position: 0 },
                { id: '2', color: '#f687b3', position: 100 },
            ],
        },
    ];

    useEffect(() => {
        setPalette(color.palette);
    }, [color]);

    useEffect(() => {
        const selectedElement = editorEngine.elements.selected[0];
        const computedBackgroundImage = selectedElement
            ? editorEngine.style.selectedStyle?.styles.computed.backgroundImage
            : undefined;

        const activeGradientSource = computedBackgroundImage ?? backgroundImage;

        if (hasGradient(activeGradientSource)) {
            const parsed = parseGradientFromCSS(activeGradientSource!);
            if (parsed && parsed.stops.length > 0) {
                setGradientState(parsed);
                setActiveTab(TabValue.GRADIENT);
                const firstStop = parsed.stops[0];
                if (firstStop) {
                    setSelectedStopId(firstStop.id);
                    onChange(Color.from(firstStop.color));
                }
            } else {
                setActiveTab(TabValue.GRADIENT);
            }
        } else if (selectedElement) {
            const defaultGradient: GradientState = {
                type: 'linear',
                angle: 90,
                stops: [
                    { id: 'stop-1', color: '#ff6b6b', position: 0, opacity: 100 },
                    { id: 'stop-2', color: '#feca57', position: 100, opacity: 100 },
                ],
            };
            setGradientState(defaultGradient);
            setSelectedStopId('stop-1');
        }
    }, [editorEngine.elements.selected, editorEngine.style.selectedStyle?.styles.computed.backgroundImage, backgroundImage, parseGradientFromCSS, onChange]);

    useEffect(() => {
        (async () => {
            try {
                await editorEngine.theme.scanConfig();
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

    const filteredColorGroups = Object.entries(colorGroups).filter(([name, colors]) => {
        const query = searchQuery.toLowerCase();
        return (
            name.toLowerCase().includes(query) ||
            colors.some((color) => color.name.toLowerCase().includes(query))
        );
    });

    const filteredColorDefaults = Object.entries(colorDefaults).filter(([name, colors]) => {
        const query = searchQuery.toLowerCase();
        return (
            name.toLowerCase().includes(query) ||
            colors.some((color) => color.name.toLowerCase().includes(query))
        );
    });

    const handleColorSelect = (colorItem: TailwindColor) => {
        if (hasGradient(backgroundImage)) {
            editorEngine.style.update('backgroundImage', 'none');
        }
        onChangeEnd(colorItem);
    };

    const handleRemoveColor = () => {
        if (hasGradient(backgroundImage)) {
            editorEngine.style.update('backgroundImage', 'none');
            return;
        }
        const removeColorAction: TailwindColor = {
            name: 'remove',
            originalKey: '',
            lightColor: '',
            darkColor: '',
        };
        onChangeEnd(removeColorAction);
    };

    const handleGradientChange = useCallback(
        (newGradient: GradientState) => {
            setGradientState(newGradient);
            setActiveTab(TabValue.GRADIENT);
            handleGradientUpdateEnd(newGradient);
        },
        [handleGradientUpdateEnd],
    );

    const handleStopColorChange = useCallback(
        (stopId: string, newColor: Color) => {
            try {
                const updatedGradient = {
                    ...gradientState,
                    stops: gradientState.stops.map((stop) =>
                        stop.id === stopId ? { ...stop, color: newColor.toHex() } : stop,
                    ),
                };
                setGradientState(updatedGradient);
                handleGradientChange(updatedGradient);
            } catch (error) {
                console.error('Error updating stop color:', error);
            }
        },
        [gradientState, handleGradientChange],
    );

    const handleStopSelect = useCallback(
        (stopId: string) => {
            setSelectedStopId(stopId);
            setActiveTab(TabValue.GRADIENT);
            const selectedStop = gradientState.stops.find((s) => s.id === stopId);
            if (selectedStop) {
                const stopColor = Color.from(selectedStop.color);
                onChange(stopColor);
            }
        },
        [gradientState.stops, onChange],
    );

    const applyPresetGradient = useCallback((preset: PresetGradient) => {
        try {
            let angle = 0;
            if (preset.type === 'linear') {
                angle = parseInt((/(\d+)deg/.exec(preset.css))?.[1] ?? '90');
            }

            const newGradientState: GradientState = {
                type: preset.type,
                angle: angle,
                stops: preset.stops.map((stop, index) => ({
                    id: `stop-${index + 1}`,
                    color: stop.color,
                    position: stop.position,
                    opacity: stop.opacity ?? 100,
                })),
            };
            setGradientState(newGradientState);
            setSelectedStopId('stop-1');
            handleGradientChange(newGradientState);

            const firstStop = newGradientState.stops[0];
            if (firstStop) {
                onChange(Color.from(firstStop.color));
            }
        } catch (error) {
            console.error('Error applying preset gradient:', error);
        }
    }, [handleGradientChange, onChange]);

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
                                onClick={() => {
                                    if (hasGradient(backgroundImage)) {
                                        editorEngine.style.update('backgroundImage', 'none');
                                    }
                                    onChangeEnd(
                                        Color.from(
                                            palette.colors[Number.parseInt(level)] ?? '#000000',
                                        ),
                                    );
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {colors.map((level) => (
                            <div
                                className="gap-2 hover:bg-background-secondary p-1 flex align-center cursor-pointer rounded-md group"
                                key={level}
                                onClick={() => {
                                    if (hasGradient(backgroundImage)) {
                                        editorEngine.style.update('backgroundImage', 'none');
                                    }
                                    onChangeEnd(
                                        Color.from(
                                            palette.colors[Number.parseInt(level)] ?? '#000000',
                                        ),
                                    );
                                }}
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
                                onClick={() => applyPresetGradient(preset)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {presetGradients.map((preset) => (
                            <div
                                className="gap-2 hover:bg-background-secondary p-1 flex align-center cursor-pointer rounded-md group"
                                key={preset.id}
                                onClick={() => applyPresetGradient(preset)}
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
            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TabValue)}
                className="w-full"
            >
                {!isCreatingNewColor && (
                    <TabsList className="bg-transparent px-2 m-0 gap-2 justify-between w-full">
                        <div className="flex gap-1">
                            <TabsTrigger
                                value={TabValue.BRAND}
                                className="flex items-center justify-center px-1.5 py-1 text-xs rounded-md bg-transparent hover:bg-background-secondary hover:text-foreground-primary transition-colors"
                            >
                                Brand
                            </TabsTrigger>

                            <TabsTrigger
                                value={TabValue.CUSTOM}
                                className="flex items-center justify-center px-1.5 py-1 text-xs rounded-md bg-transparent hover:bg-background-secondary hover:text-foreground-primary transition-colors"
                            >
                                Custom
                            </TabsTrigger>
                            {!hideGradient && (
                                <TabsTrigger
                                    value={TabValue.GRADIENT}
                                    className="flex items-center justify-center px-1.5 py-1 text-xs rounded-md bg-transparent hover:bg-background-secondary hover:text-foreground-primary transition-colors"
                                >
                                    Gradient
                                </TabsTrigger>
                            )}
                        </div>
                        {!isCreatingNewColor && (
                            <HoverOnlyTooltip
                                content="Remove Color"
                                side="bottom"
                                className="mt-1"
                                hideArrow
                                disabled={isColorRemoved(color)}
                            >
                                <button
                                    className={cn(
                                        'p-1 rounded transition-colors',
                                        isColorRemoved(color)
                                            ? 'bg-background-secondary'
                                            : 'hover:bg-background-tertiary'
                                    )}
                                    onClick={handleRemoveColor}
                                >
                                    <Icons.SquareX
                                        className={cn(
                                            'h-4 w-4',
                                            isColorRemoved(color)
                                                ? 'text-foreground-primary'
                                                : 'text-foreground-tertiary'
                                        )}
                                    />
                                </button>
                            </HoverOnlyTooltip>
                        )}
                    </TabsList>
                )}

                {!isCreatingNewColor && (
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
                )}

                <TabsContent value={TabValue.CUSTOM} className="p-0 m-0">
                    <ColorPicker
                        color={color}
                        onChange={onChange}
                        onChangeEnd={(val) => {
                            if (hasGradient(backgroundImage)) {
                                editorEngine.style.update('backgroundImage', 'none');
                            }
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
                                <Icons.ViewGrid className="w-3 h-3" />
                            ) : (
                                <Icons.ViewHorizontal className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    <Separator />
                    <div className="h-28 px-1 overflow-hidden overflow-y-auto">
                        {renderPalette()}
                    </div>
                </TabsContent>
                {!isCreatingNewColor && (
                    <TabsContent value={TabValue.GRADIENT} className="p-0 m-0">
                        <Gradient
                            gradient={gradientState}
                            onGradientChange={handleGradientChange}
                            onStopColorChange={handleStopColorChange}
                            onStopSelect={handleStopSelect}
                            selectedStopId={selectedStopId}
                            className="border-b border-border"
                            showPresets={false}
                        />

                        <div className="flex flex-row items-center justify-between w-full px-2 py-1">
                            <span className="text-foreground-secondary text-small">Presets</span>
                            <button
                                className={`px-1 py-1 text-xs transition-colors w-6 h-6 flex items-center justify-center rounded ${viewMode === 'grid'
                                    ? 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-hover'
                                    : 'text-foreground-primary bg-background-secondary'
                                    }`}
                                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                title="Toggle view mode"
                            >
                                {viewMode === 'grid' ? (
                                    <Icons.ViewGrid className="w-3 h-3" />
                                ) : (
                                    <Icons.ViewHorizontal className="w-3 h-3" />
                                )}
                            </button>
                        </div>
                        <Separator />
                        <div className="h-28 px-1 overflow-hidden overflow-y-auto">
                            {renderPresets()}
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};

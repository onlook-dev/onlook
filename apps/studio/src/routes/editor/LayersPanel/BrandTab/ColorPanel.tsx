import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { useProjectsManager } from '@/components/Context';
import { MainChannels } from '@onlook/models/constants';
import { invokeMainChannel } from '@/lib/utils';
import { Color } from '@onlook/utility';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import ColorPickerContent from '../../EditPanel/StylesTab/single/ColorInput/ColorPicker';
import { cn } from '@onlook/ui/utils';
interface ColorRowProps {
    label: string;
    colors: string[];
}

const ColorRow = ({ label, colors }: ColorRowProps) => (
    <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="grid grid-cols-6 gap-1">
            {colors.map((color, index) => (
                <div
                    key={`${label}-${index}`}
                    className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    </div>
);

const ColorPopover = ({
    color,
    brandColor,
    onClose,
    onColorChange,
}: {
    color: Color;
    brandColor: string;
    onClose?: () => void;
    onColorChange?: (newColor: Color, newName: string) => void;
}) => {
    const [editedColor, setEditedColor] = useState<Color>(color);
    const [editedName, setEditedName] = useState<string>(brandColor);

    const handleColorChange = (newColor: Color) => {
        setEditedColor(newColor);
    };

    const handleSave = () => {
        if (onColorChange) {
            onColorChange(editedColor, editedName);
        }
        if (onClose) {
            onClose();
        }
    };

    return (
        <Popover onOpenChange={(open) => !open && handleSave()} open={true}>
            <PopoverTrigger asChild>
                <div
                    className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                    style={{ backgroundColor: editedColor.toHex() }}
                />
            </PopoverTrigger>
            <PopoverContent className="w-64">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Color Name</label>
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-background-secondary px-2 py-1 text-sm"
                        />
                    </div>
                    <ColorPickerContent
                        color={editedColor}
                        onChange={handleColorChange}
                        onChangeEnd={handleColorChange}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};

interface BrandPalletGroupProps {
    title: string;
    colors?: ColorItem[];
    theme: 'dark' | 'light';
    onRename: () => void;
    onDelete: () => void;
    onColorChange?: (
        groupName: string,
        colorIndex: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => void;
}

const BrandPalletGroup = ({
    title,
    colors,
    theme,
    onRename,
    onDelete,
    onColorChange,
}: BrandPalletGroupProps) => {
    const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
    const [isAddingNewColor, setIsAddingNewColor] = useState(false);

    const handleColorChange = (
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        if (onColorChange) {
            onColorChange(title.toLowerCase(), index, newColor, newName, parentName);
        }
        setEditingColorIndex(null);
        setIsAddingNewColor(false);
    };

    const getColorValue = (color: ColorItem) => {
        return theme === 'dark' ? color.darkColor || color.lightColor : color.lightColor;
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-normal">{title}</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                        >
                            <Icons.DotsHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="rounded-md bg-background"
                        align="start"
                        side="bottom"
                    >
                        <DropdownMenuItem asChild>
                            <Button
                                variant="ghost"
                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                onClick={onRename}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.Pencil className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Rename</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Button
                                variant="ghost"
                                className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                onClick={onDelete}
                            >
                                <span className="flex w-full text-smallPlus items-center">
                                    <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                    <span>Delete</span>
                                </span>
                            </Button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-6 gap-1">
                    {colors ? (
                        colors.map((color, index) => (
                            <div key={`${title}-${index}`} className="relative group">
                                {editingColorIndex === index ? (
                                    <ColorPopover
                                        color={Color.from(getColorValue(color))}
                                        brandColor={color.name}
                                        onClose={() => setEditingColorIndex(null)}
                                        onColorChange={(newColor, newName) =>
                                            handleColorChange(index, newColor, newName)
                                        }
                                    />
                                ) : (
                                    <>
                                        <div
                                            className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                                            style={{ backgroundColor: getColorValue(color) }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 [&[data-state=open]]:opacity-100">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-[85%] w-[85%] p-0 bg-black hover:bg-black rounded-md flex items-center justify-center"
                                                    >
                                                        <Icons.DotsHorizontal className="h-4 w-4 text-white" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    className="rounded-md bg-background p-1 min-w-[140px]"
                                                    align="start"
                                                    side="bottom"
                                                >
                                                    <div className="flex items-start gap-2 px-2 py-1 border-b border-border mb-0.5">
                                                        <div
                                                            className="w-4 h-4 rounded-sm mt-[2px]"
                                                            style={{
                                                                backgroundColor:
                                                                    getColorValue(color),
                                                            }}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-foreground">
                                                                {color.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {getColorValue(color)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                            onClick={() =>
                                                                setEditingColorIndex(index)
                                                            }
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.Pencil className="mr-2 h-4 w-4" />
                                                                <span>Edit color</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.Copy className="mr-2 h-4 w-4" />
                                                                <span>Duplicate</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                            onClick={onDelete}
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.Trash className="mr-2 h-4 w-4" />
                                                                <span>Delete</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <></>
                    )}
                    {isAddingNewColor ? (
                        <ColorPopover
                            color={Color.from('#FFFFFF')}
                            brandColor="New Color"
                            onClose={() => setIsAddingNewColor(false)}
                            onColorChange={(newColor, newName) =>
                                handleColorChange(
                                    colors?.length || 0,
                                    newColor,
                                    newName,
                                    title.toLowerCase(),
                                )
                            }
                        />
                    ) : (
                        <Button
                            onClick={() => setIsAddingNewColor(true)}
                            variant="outline"
                            size="icon"
                            className="w-full aspect-square rounded-lg border border-dashed flex items-center justify-center bg-transparent hover:bg-transparent"
                        >
                            <Icons.Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ThemeColors {
    [key: string]: string;
}

interface ColorValue {
    name: string;
    lightMode: string;
    darkMode: string;
}

interface ParsedColors {
    [key: string]: ColorValue;
}

interface ConfigResult {
    cssContent: string;
    cssPath: string;
    configPath: string;
    configContent: any;
}

interface ColorItem {
    name: string;
    originalKey: string;
    lightColor: string;
    darkColor?: string;
}

interface BrandTabProps {
    onClose: () => void;
}

const BrandTab = observer(({ onClose }: BrandTabProps) => {
    const [colorGroups, setColorGroups] = useState<{ [key: string]: ColorItem[] }>({});
    const [theme, setTheme] = useState<'dark' | 'light'>('light');

    const projectsManager = useProjectsManager();
    const loadColors = async () => {
        const projectRoot = projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            const configResult = (await invokeMainChannel(MainChannels.SCAN_TAILWIND_CONFIG, {
                projectRoot,
            })) as ConfigResult;

            if (!configResult) {
                return;
            }

            const { cssContent, configContent } = configResult;

            const cssConfig = typeof cssContent === 'string' ? JSON.parse(cssContent) : cssContent;
            const config =
                typeof configContent === 'string' ? JSON.parse(configContent) : configContent;

            const lightModeColors: ThemeColors = cssConfig.root || {};
            const darkModeColors: ThemeColors = cssConfig.dark || {};

            const parsed: ParsedColors = {};
            const groups: { [key: string]: Set<string> } = {};

            const processConfigObject = (obj: any, prefix = '', parentKey = '') => {
                Object.entries(obj).forEach(([key, value]) => {
                    const fullKey = prefix ? `${prefix}-${key}` : key;

                    if (parentKey) {
                        if (!groups[parentKey]) {
                            groups[parentKey] = new Set();
                        }
                        groups[parentKey].add(fullKey);
                    }

                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        processConfigObject(value, prefix ? `${prefix}-${key}` : key, key);

                        if ('DEFAULT' in value) {
                            const varName = extractVarName(value.DEFAULT as string);
                            if (varName) {
                                parsed[key] = {
                                    name: key,
                                    lightMode: lightModeColors[varName] || '',
                                    darkMode: darkModeColors[varName] || '',
                                };
                            }
                        }
                    } else if (typeof value === 'string') {
                        // Try to extract the var name first
                        const varName = extractVarName(value);
                        if (varName) {
                            parsed[fullKey] = {
                                name: fullKey,
                                lightMode: lightModeColors[varName] || '',
                                darkMode: darkModeColors[varName] || '',
                            };
                        } else {
                            const color = Color.from(value);
                            if (color) {
                                parsed[fullKey] = {
                                    name: fullKey,
                                    lightMode: color.toHex(),
                                    darkMode: color.toHex(),
                                };
                            }
                        }
                    }
                });
            };

            const extractVarName = (value: string): string | null => {
                if (typeof value !== 'string') {
                    return null;
                }
                const match = value.match(/var\(--([^)]+)\)/);
                return match ? match[1] : null;
            };

            processConfigObject(config);

            // Convert groups to color items for UI
            const colorGroupsObj: { [key: string]: ColorItem[] } = {};

            Object.entries(groups).forEach(([groupName, colorKeys]) => {
                if (colorKeys.size > 0) {
                    colorGroupsObj[groupName] = Array.from(colorKeys).map((key) => {
                        const color = parsed[key];
                        return {
                            name: key.includes('-') ? key.split('-').pop() || key : key,
                            originalKey: key,
                            lightColor: color?.lightMode || '',
                            darkColor: color?.darkMode || '',
                        };
                    });
                }
            });

            // Handle any top-level colors that aren't part of a group
            const ungroupedKeys = Object.keys(parsed).filter(
                (key) => !Object.values(groups).some((set) => set.has(key)),
            );

            if (ungroupedKeys.length > 0) {
                colorGroupsObj['base'] = ungroupedKeys.map((key) => ({
                    name: key,
                    originalKey: key,
                    lightColor: parsed[key].lightMode,
                    darkColor: parsed[key].darkMode,
                }));
            }

            console.log('Color groups:', colorGroupsObj);
            setColorGroups(colorGroupsObj);
        } catch (error) {
            console.error('Error loading colors:', error);
        }
    };
    useEffect(() => {
        loadColors();
    }, [projectsManager.project?.folderPath]);

    const handleRename = () => {
        // Implement rename logic
    };

    const handleDelete = () => {
        // Implement delete logic
    };

    const handleColorChange = async (
        groupName: string,
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        const projectRoot = projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            // For new colors, pass empty originalKey and parentName
            const originalKey = colorGroups[groupName]?.[index]?.originalKey || '';
            await invokeMainChannel(MainChannels.UPDATE_TAILWIND_CONFIG, {
                projectRoot,
                originalKey,
                newColor: newColor.toHex(),
                newName,
                parentName,
                theme,
            });

            // Refresh colors after update
            loadColors();
        } catch (error) {
            console.error('Error updating color:', error);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0 overflow-y-auto">
            <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                <h2 className="text-sm font-normal text-foreground">Brand Colors</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-background-secondary"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>
            {/* Theme Toggle */}
            <div className="flex gap-2 px-4 py-3 border-b border-border">
                <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    className={cn(
                        'flex-1 gap-2 border-none text-gray-200 hover:bg-background-secondary',
                        theme === 'light' && 'bg-gray-900 text-white',
                    )}
                    onClick={() => setTheme('light')}
                >
                    <Icons.Sun className="h-4 w-4" />
                    Light mode
                </Button>
                <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    className={cn(
                        'flex-1 gap-2 border-none text-gray-200 hover:bg-background-secondary',
                        theme === 'dark' && 'bg-gray-900 text-white',
                    )}
                    onClick={() => setTheme('dark')}
                >
                    <Icons.Moon className="h-4 w-4" />
                    Dark mode
                </Button>
            </div>

            {/* Brand Palette Groups section */}
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-4">
                    {/* Theme color groups */}
                    {Object.entries(colorGroups).map(([groupName, colors]) => (
                        <BrandPalletGroup
                            key={groupName}
                            theme={theme}
                            title={groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                            colors={colors}
                            onRename={handleRename}
                            onDelete={handleDelete}
                            onColorChange={handleColorChange}
                        />
                    ))}
                </div>
                <Button
                    variant="ghost"
                    className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                >
                    Add a new group
                </Button>
            </div>

            {/* Color Palette section */}
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-4">
                    {/* Grays */}
                    <ColorRow
                        label="Slate"
                        colors={[
                            '#f8fafc',
                            '#f1f5f9',
                            '#e2e8f0',
                            '#cbd5e1',
                            '#94a3b8',
                            '#64748b',
                            '#475569',
                            '#334155',
                            '#1e293b',
                            '#0f172a',
                        ]}
                    />
                    <ColorRow
                        label="Gray"
                        colors={[
                            '#f9fafb',
                            '#f3f4f6',
                            '#e5e7eb',
                            '#d1d5db',
                            '#9ca3af',
                            '#6b7280',
                            '#4b5563',
                            '#374151',
                            '#1f2937',
                            '#111827',
                        ]}
                    />
                    <ColorRow
                        label="Zinc"
                        colors={[
                            '#fafafa',
                            '#f4f4f5',
                            '#e4e4e7',
                            '#d4d4d8',
                            '#a1a1aa',
                            '#71717a',
                            '#52525b',
                            '#3f3f46',
                            '#27272a',
                            '#18181b',
                        ]}
                    />
                    <ColorRow
                        label="Neutral"
                        colors={[
                            '#fafafa',
                            '#f5f5f5',
                            '#e5e5e5',
                            '#d4d4d4',
                            '#a3a3a3',
                            '#737373',
                            '#525252',
                            '#404040',
                            '#262626',
                            '#171717',
                        ]}
                    />
                    <ColorRow
                        label="Stone"
                        colors={[
                            '#fafaf9',
                            '#f5f5f4',
                            '#e7e5e4',
                            '#d6d3d1',
                            '#a8a29e',
                            '#78716c',
                            '#57534e',
                            '#44403c',
                            '#292524',
                            '#1c1917',
                        ]}
                    />

                    {/* Colors */}
                    <ColorRow
                        label="Red"
                        colors={[
                            '#fef2f2',
                            '#fee2e2',
                            '#fecaca',
                            '#fca5a5',
                            '#f87171',
                            '#ef4444',
                            '#dc2626',
                            '#b91c1c',
                            '#991b1b',
                            '#7f1d1d',
                        ]}
                    />
                    <ColorRow
                        label="Orange"
                        colors={[
                            '#fff7ed',
                            '#ffedd5',
                            '#fed7aa',
                            '#fdba74',
                            '#fb923c',
                            '#f97316',
                            '#ea580c',
                            '#c2410c',
                            '#9a3412',
                            '#7c2d12',
                        ]}
                    />
                    <ColorRow
                        label="Amber"
                        colors={[
                            '#fffbeb',
                            '#fef3c7',
                            '#fde68a',
                            '#fcd34d',
                            '#fbbf24',
                            '#f59e0b',
                            '#d97706',
                            '#b45309',
                            '#92400e',
                            '#78350f',
                        ]}
                    />
                    <ColorRow
                        label="Yellow"
                        colors={[
                            '#fefce8',
                            '#fef9c3',
                            '#fef08a',
                            '#fde047',
                            '#facc15',
                            '#eab308',
                            '#ca8a04',
                            '#a16207',
                            '#854d0e',
                            '#713f12',
                        ]}
                    />
                    <ColorRow
                        label="Lime"
                        colors={[
                            '#f7fee7',
                            '#ecfccb',
                            '#d9f99d',
                            '#bef264',
                            '#a3e635',
                            '#84cc16',
                            '#65a30d',
                            '#4d7c0f',
                            '#3f6212',
                            '#365314',
                        ]}
                    />
                    <ColorRow
                        label="Green"
                        colors={[
                            '#f0fdf4',
                            '#dcfce7',
                            '#bbf7d0',
                            '#86efac',
                            '#4ade80',
                            '#22c55e',
                            '#16a34a',
                            '#15803d',
                            '#166534',
                            '#14532d',
                        ]}
                    />
                    <ColorRow
                        label="Emerald"
                        colors={[
                            '#ecfdf5',
                            '#d1fae5',
                            '#a7f3d0',
                            '#6ee7b7',
                            '#34d399',
                            '#10b981',
                            '#059669',
                            '#047857',
                            '#065f46',
                            '#064e3b',
                        ]}
                    />
                    <ColorRow
                        label="Teal"
                        colors={[
                            '#f0fdfa',
                            '#ccfbf1',
                            '#99f6e4',
                            '#5eead4',
                            '#2dd4bf',
                            '#14b8a6',
                            '#0d9488',
                            '#0f766e',
                            '#115e59',
                            '#134e4a',
                        ]}
                    />
                    <ColorRow
                        label="Cyan"
                        colors={[
                            '#ecfeff',
                            '#cffafe',
                            '#a5f3fc',
                            '#67e8f9',
                            '#22d3ee',
                            '#06b6d4',
                            '#0891b2',
                            '#0e7490',
                            '#155e75',
                            '#164e63',
                        ]}
                    />
                    <ColorRow
                        label="Sky"
                        colors={[
                            '#f0f9ff',
                            '#e0f2fe',
                            '#bae6fd',
                            '#7dd3fc',
                            '#38bdf8',
                            '#0ea5e9',
                            '#0284c7',
                            '#0369a1',
                            '#075985',
                            '#0c4a6e',
                        ]}
                    />
                    <ColorRow
                        label="Blue"
                        colors={[
                            '#eff6ff',
                            '#dbeafe',
                            '#bfdbfe',
                            '#93c5fd',
                            '#60a5fa',
                            '#3b82f6',
                            '#2563eb',
                            '#1d4ed8',
                            '#1e40af',
                            '#1e3a8a',
                        ]}
                    />
                    <ColorRow
                        label="Indigo"
                        colors={[
                            '#eef2ff',
                            '#e0e7ff',
                            '#c7d2fe',
                            '#a5b4fc',
                            '#818cf8',
                            '#6366f1',
                            '#4f46e5',
                            '#4338ca',
                            '#3730a3',
                            '#312e81',
                        ]}
                    />
                    <ColorRow
                        label="Violet"
                        colors={[
                            '#f5f3ff',
                            '#ede9fe',
                            '#ddd6fe',
                            '#c4b5fd',
                            '#a78bfa',
                            '#8b5cf6',
                            '#7c3aed',
                            '#6d28d9',
                            '#5b21b6',
                            '#4c1d95',
                        ]}
                    />
                    <ColorRow
                        label="Purple"
                        colors={[
                            '#faf5ff',
                            '#f3e8ff',
                            '#e9d5ff',
                            '#d8b4fe',
                            '#c084fc',
                            '#a855f7',
                            '#9333ea',
                            '#7e22ce',
                            '#6b21a8',
                            '#581c87',
                        ]}
                    />
                    <ColorRow
                        label="Fuchsia"
                        colors={[
                            '#fdf4ff',
                            '#fae8ff',
                            '#f5d0fe',
                            '#f0abfc',
                            '#e879f9',
                            '#d946ef',
                            '#c026d3',
                            '#a21caf',
                            '#86198f',
                            '#701a75',
                        ]}
                    />
                    <ColorRow
                        label="Pink"
                        colors={[
                            '#fdf2f8',
                            '#fce7f3',
                            '#fbcfe8',
                            '#f9a8d4',
                            '#f472b6',
                            '#ec4899',
                            '#db2777',
                            '#be185d',
                            '#9d174d',
                            '#831843',
                        ]}
                    />
                    <ColorRow
                        label="Rose"
                        colors={[
                            '#fff1f2',
                            '#ffe4e6',
                            '#fecdd3',
                            '#fda4af',
                            '#fb7185',
                            '#f43f5e',
                            '#e11d48',
                            '#be123c',
                            '#9f1239',
                            '#881337',
                        ]}
                    />
                </div>
            </div>
        </div>
    );
});

export default BrandTab;

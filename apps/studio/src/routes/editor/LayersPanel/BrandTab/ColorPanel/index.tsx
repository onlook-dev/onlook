import { useProjectsManager } from '@/components/Context';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { Color } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { BrandPalletGroup, type ColorItem } from './ColorPalletGroup';
import colors from 'tailwindcss/colors';

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

interface ColorPanelProps {
    onClose: () => void;
}

const ColorPanel = observer(({ onClose }: ColorPanelProps) => {
    const [colorGroups, setColorGroups] = useState<{ [key: string]: ColorItem[] }>({});
    const [theme, setTheme] = useState<'dark' | 'light'>('light');
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
    const [defaultColors, setDefaultColors] = useState<
        {
            name: string;
            colors: ColorItem[];
        }[]
    >([]);
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
            const def = generateDefaultColors(lightModeColors, darkModeColors);
            if (def) {
                setDefaultColors(def);
            }
            setColorGroups(colorGroupsObj);
        } catch (error) {
            console.error('Error loading colors:', error);
        }
    };

    const generateDefaultColors = (lightModeColors: any, darkModeColors: any) => {
        return Object.keys(colors)
            .map((colorName) => {
                if (['inherit', 'current', 'transparent', 'black', 'white'].includes(colorName)) {
                    return null;
                }

                const defaultColorScale = colors[colorName as keyof typeof colors];

                if (typeof defaultColorScale !== 'object' || defaultColorScale === null) {
                    return null;
                }

                // Create color items for each shade in the scale
                const colorItems: ColorItem[] = Object.entries(defaultColorScale)
                    .filter(([shade]) => shade !== 'DEFAULT') // Skip default value if present
                    .map(([shade, defaultValue]) => {
                        // Check if this color is overridden in the config
                        const lightModeValue = lightModeColors[`${colorName}-${shade}`];
                        const darkModeValue = darkModeColors[`${colorName}-${shade}`];
                        if (lightModeValue || darkModeValue) {
                            return {
                                name: shade,
                                originalKey: `${colorName}-${shade}`,
                                lightColor: lightModeValue || '',
                                darkColor: darkModeValue || '',
                            };
                        }

                        // If no override, use the default value
                        return {
                            name: shade,
                            originalKey: `${colorName}-${shade}`,
                            lightColor: defaultValue,
                            darkColor: defaultValue,
                        };
                    });

                return {
                    name: colorName,
                    colors: colorItems,
                };
            })
            .filter((item): item is { name: string; colors: ColorItem[] } => item !== null); // Type guard to remove nulls
    };

    useEffect(() => {
        loadColors();
    }, [projectsManager.project?.folderPath]);

    const handleRename = async (oldName: string, newName: string) => {
        const projectRoot = projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            await invokeMainChannel(MainChannels.UPDATE_TAILWIND_CONFIG, {
                projectRoot,
                originalKey: oldName.toLowerCase(),
                newName: newName.toLowerCase(),
            });

            // Refresh colors after rename
            loadColors();
        } catch (error) {
            console.error('Error renaming color group:', error);
        }
    };

    const handleDelete = async (groupName: string, colorName?: string) => {
        const projectRoot = projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            await invokeMainChannel(MainChannels.DELETE_TAILWIND_CONFIG, {
                projectRoot,
                groupName: groupName.toLowerCase(),
                colorName,
            });

            // Refresh colors after deletion
            loadColors();
        } catch (error) {
            console.error('Error deleting color:', error);
        }
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

    const handleAddNewGroup = async (newName: string) => {
        const projectRoot = projectsManager.project?.folderPath;
        if (!projectRoot || !newName.trim()) {
            return;
        }

        try {
            await invokeMainChannel(MainChannels.UPDATE_TAILWIND_CONFIG, {
                projectRoot,
                originalName: '',
                newName: newName.trim(),
                newColor: '#FFFFFF',
            });

            // Reset state
            setIsAddingNewGroup(false);

            // Refresh colors
            loadColors();
        } catch (error) {
            console.error('Error adding color group:', error);
        }
    };

    const handleDefaultColorChange = async (
        colorFamily: string,
        index: number,
        newColor: Color,
    ) => {
        const projectRoot = projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            await invokeMainChannel(MainChannels.UPDATE_TAILWIND_CONFIG, {
                projectRoot,
                originalKey: `${colorFamily}-${index * 100}`,
                newColor: newColor.toHex(),
                theme,
            });

            // Refresh colors after update
            loadColors();
        } catch (error) {
            console.error('Error updating default color:', error);
        }
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
                            onDelete={(colorName) => handleDelete(groupName, colorName)}
                            onColorChange={handleColorChange}
                        />
                    ))}
                </div>
                {isAddingNewGroup ? (
                    <div className="flex flex-col gap-1">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Enter group name"
                            className="w-full rounded-md border border-white/10 bg-background-secondary px-2 py-1 text-sm"
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    handleAddNewGroup(e.target.value);
                                } else {
                                    setIsAddingNewGroup(false);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    handleAddNewGroup(e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                    setIsAddingNewGroup(false);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                        onClick={() => setIsAddingNewGroup(true)}
                    >
                        Add a new group
                    </Button>
                )}
            </div>

            {/* Color Palette section */}
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <h3 className="text-sm font-medium mb-2">Default Colors</h3>
                {defaultColors.map(
                    (color) =>
                        color && (
                            <BrandPalletGroup
                                key={color.name}
                                theme={theme}
                                title={color.name.charAt(0).toUpperCase() + color.name.slice(1)}
                                colors={color.colors}
                                onRename={handleRename}
                                onDelete={(colorName) => handleDelete(color.name, colorName)}
                                onColorChange={(groupName, colorIndex, newColor) =>
                                    handleDefaultColorChange(color.name, colorIndex, newColor)
                                }
                                isDefaultPalette={true}
                            />
                        ),
                )}
            </div>
        </div>
    );
});

export default ColorPanel;

import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel } from '@/lib/utils';
import type { ColorItem } from '@/routes/editor/LayersPanel/BrandTab/ColorPanel/ColorPalletGroup';
import { MainChannels } from '@onlook/models';
import type { ConfigResult, ParsedColors, ThemeColors } from '@onlook/models/assets';
import { Theme } from '@onlook/models/assets';
import { Color } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import colors from 'tailwindcss/colors';
import type { EditorEngine } from '..';

export class ThemeManager {
    private brandColors: Record<string, ColorItem[]> = {};
    private defaultColors: Record<string, ColorItem[]> = {};

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.scanConfig();
    }

    async scanConfig() {
        const projectRoot = this.projectsManager.project?.folderPath;
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
            const ungroupedKeys = Object.keys(parsed).filter((key) => {
                const isInGroup = Object.values(groups).some((set) => set.has(key));
                if (isInGroup) {
                    return false;
                }
                const isPrefix = Object.values(groups).some((set) =>
                    Array.from(set).some((groupedKey) => groupedKey.startsWith(key + '-')),
                );

                return !isPrefix;
            });

            if (ungroupedKeys.length > 0) {
                ungroupedKeys.forEach((key) => {
                    colorGroupsObj[key] = [
                        {
                            name: 'DEFAULT',
                            originalKey: `${key}-DEFAULT`,
                            lightColor: parsed[key].lightMode,
                            darkColor: parsed[key].darkMode,
                        },
                    ];
                });
            }
            const defaultColors = this.generateDefaultColors(lightModeColors, darkModeColors);
            if (defaultColors) {
                this.defaultColors = defaultColors;
            }
            this.brandColors = colorGroupsObj;
        } catch (error) {
            console.error('Error loading colors:', error);
        }
    }

    generateDefaultColors(lightModeColors: any, darkModeColors: any) {
        const deprecatedColors = ['lightBlue', 'warmGray', 'trueGray', 'coolGray', 'blueGray'];
        const excludedColors = [
            'inherit',
            'current',
            'transparent',
            'black',
            'white',
            ...deprecatedColors,
        ];

        // Create a record instead of an array
        const defaultColorsRecord: Record<string, ColorItem[]> = {};

        Object.keys(colors)
            .filter((colorName) => !excludedColors.includes(colorName))
            .forEach((colorName) => {
                const defaultColorScale = colors[colorName as keyof typeof colors];

                if (typeof defaultColorScale !== 'object' || defaultColorScale === null) {
                    return;
                }

                // Create color items for each shade in the scale
                const colorItems: ColorItem[] = Object.entries(defaultColorScale)
                    .filter(([shade]) => shade !== 'DEFAULT')
                    .map(([shade, defaultValue]) => {
                        const lightModeValue = lightModeColors[`${colorName}-${shade}`];
                        const darkModeValue = darkModeColors[`${colorName}-${shade}`];

                        return {
                            name: shade,
                            originalKey: `${colorName}-${shade}`,
                            lightColor: lightModeValue || defaultValue,
                            darkColor: darkModeValue || defaultValue,
                        };
                    });

                // Add custom shades
                const customShades = Object.keys(lightModeColors)
                    .filter((key) => key.startsWith(`${colorName}-`))
                    .map((key) => key.split('-')[1])
                    .filter((shade) => !colorItems.some((item) => item.name === shade));

                customShades.forEach((shade) => {
                    const lightModeValue = lightModeColors[`${colorName}-${shade}`];
                    const darkModeValue = darkModeColors[`${colorName}-${shade}`];
                    colorItems.push({
                        name: shade,
                        originalKey: `${colorName}-${shade}`,
                        lightColor: lightModeValue || '',
                        darkColor: darkModeValue || '',
                    });
                });

                // Sort color items by shade number
                colorItems.sort((a, b) => {
                    const aNum = parseInt(a.name);
                    const bNum = parseInt(b.name);
                    return aNum - bNum;
                });

                // Add to record instead of array
                defaultColorsRecord[colorName] = colorItems;
            });

        return defaultColorsRecord;
    }

    async rename(oldName: string, newName: string) {
        const projectRoot = this.projectsManager.project?.folderPath;
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
            this.scanConfig();
        } catch (error) {
            console.error('Error renaming color group:', error);
        }
    }

    async delete(groupName: string, colorName?: string) {
        const projectRoot = this.projectsManager.project?.folderPath;
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
            this.scanConfig();
        } catch (error) {
            console.error('Error deleting color:', error);
        }
    }

    async update(
        groupName: string,
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
        theme?: Theme,
    ) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            // For new colors, pass empty originalKey and parentName
            const originalKey = this.brandColors[groupName]?.[index]?.originalKey || '';
            await invokeMainChannel(MainChannels.UPDATE_TAILWIND_CONFIG, {
                projectRoot,
                originalKey,
                newColor: newColor.toHex(),
                newName,
                parentName,
                theme,
            });

            // Refresh colors after update
            this.scanConfig();
        } catch (error) {
            console.error('Error updating color:', error);
        }
    }

    async add(newName: string) {
        const projectRoot = this.projectsManager.project?.folderPath;
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
            // Refresh colors
            this.scanConfig();
        } catch (error) {
            console.error('Error adding color group:', error);
        }
    }

    async handleDefaultColorChange(
        colorFamily: string,
        index: number,
        newColor: Color,
        theme?: Theme,
    ) {
        const projectRoot = this.projectsManager.project?.folderPath;
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
            this.scanConfig();
        } catch (error) {
            console.error('Error updating default color:', error);
        }
    }

    async duplicate(
        groupName: string,
        colorName: string,
        isDefaultPalette?: boolean,
        theme?: Theme,
    ) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            if (isDefaultPalette) {
                const colorToDuplicate = this.defaultColors[groupName];
                if (!colorToDuplicate || colorToDuplicate.length === 0) {
                    throw new Error('Color not found');
                }

                const colorIndex = colorToDuplicate.length;
                const color = Color.from(colorToDuplicate[colorIndex - 1].lightColor);

                await this.handleDefaultColorChange(groupName, colorIndex, color, theme);
            } else {
                const group = this.brandColors[groupName];
                const colorToDuplicate = group?.find((color) => color.name === colorName);

                if (!colorToDuplicate) {
                    throw new Error('Color not found');
                }

                const newName = `${colorName}Copy`;

                const color = Color.from(
                    theme === Theme.DARK
                        ? colorToDuplicate.darkColor || colorToDuplicate.lightColor
                        : colorToDuplicate.lightColor,
                );

                await this.update(groupName, group.length, color, newName, groupName.toLowerCase());

                this.scanConfig();
            }
        } catch (error) {
            console.error('Error duplicating color:', error);
        }
    }

    get colorGroups() {
        return this.brandColors;
    }

    get colorDefaults() {
        return this.defaultColors;
    }

    dispose() {
        this.brandColors = {};
        this.defaultColors = {};
    }
}

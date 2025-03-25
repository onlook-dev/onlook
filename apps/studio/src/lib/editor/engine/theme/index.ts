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

interface ColorValue {
    value: string;
    line?: number;
}

export class ThemeManager {
    private brandColors: Record<string, ColorItem[]> = {};
    private defaultColors: Record<string, ColorItem[]> = {};
    private configPath: string | null = null;
    private cssPath: string | null = null;

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

            const { cssContent, configContent, cssPath, configPath } = configResult;

            this.cssPath = cssPath;
            this.configPath = configPath;

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
                    if (
                        typeof value === 'object' &&
                        value !== null &&
                        !Array.isArray(value) &&
                        !('value' in value)
                    ) {
                        processConfigObject(value, prefix ? `${prefix}-${key}` : key, key);

                        if ('DEFAULT' in value) {
                            const varName = extractVarName(value.DEFAULT as string);
                            if (varName) {
                                parsed[key] = {
                                    name: key,
                                    lightMode: lightModeColors[varName]?.value || '',
                                    darkMode: darkModeColors[varName]?.value || '',
                                    line: {
                                        config: config[varName]?.line,
                                        css: {
                                            lightMode: lightModeColors[varName]?.line,
                                            darkMode: darkModeColors[varName]?.line,
                                        },
                                    },
                                };
                            }
                        }
                    } else if (
                        typeof value === 'object' &&
                        value !== null &&
                        'value' in value &&
                        typeof value.value === 'string'
                    ) {
                        // Try to extract the var name first
                        const varName = extractVarName((value as ColorValue).value);

                        if (varName) {
                            parsed[fullKey] = {
                                name: fullKey,
                                lightMode: lightModeColors[varName]?.value || '',
                                darkMode: darkModeColors[varName]?.value || '',
                                line: {
                                    config: (value as ColorValue).line,
                                    css: {
                                        lightMode: lightModeColors[varName]?.line,
                                        darkMode: darkModeColors[varName]?.line,
                                    },
                                },
                            };
                        } else {
                            const color = Color.from((value as ColorValue).value);
                            if (color) {
                                parsed[fullKey] = {
                                    name: fullKey,
                                    lightMode: color.toHex(),
                                    darkMode: color.toHex(),
                                    line: {
                                        config: (value as ColorValue).line,
                                        css: {
                                            lightMode: lightModeColors[fullKey]?.line,
                                            darkMode: darkModeColors[fullKey]?.line,
                                        },
                                    },
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
                            line: {
                                config: color?.line?.config,
                                css: color?.line?.css,
                            },
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
                            line: parsed[key].line,
                        },
                    ];
                });
            }
            const defaultColors = this.generateDefaultColors(
                lightModeColors,
                darkModeColors,
                config,
            );

            if (defaultColors) {
                this.defaultColors = defaultColors;
            }
            this.brandColors = colorGroupsObj;
        } catch (error) {
            console.error('Error loading colors:', error);
        }
    }
    generateDefaultColors(lightModeColors: ThemeColors, darkModeColors: ThemeColors, config: any) {
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
                        const lightModeValue = lightModeColors[`${colorName}-${shade}`]?.value;
                        const darkModeValue = darkModeColors[`${colorName}-${shade}`]?.value;

                        return {
                            name: shade,
                            originalKey: `${colorName}-${shade}`,
                            lightColor: lightModeValue || defaultValue,
                            darkColor: darkModeValue || defaultValue,
                            line: {
                                config: config[`${colorName}-${shade}`]?.line,
                                css: {
                                    lightMode: lightModeColors[`${colorName}-${shade}`]?.line,
                                    darkMode: darkModeColors[`${colorName}-${shade}`]?.line,
                                },
                            },
                            override: !!lightModeValue || !!darkModeValue,
                        };
                    });

                // Add custom shades
                const customShades = Object.keys(lightModeColors)
                    .filter((key) => key.startsWith(`${colorName}-`))
                    .map((key) => key.split('-')[1])
                    .filter((shade) => !colorItems.some((item) => item.name === shade));
                customShades.forEach((shade) => {
                    const lightModeValue = lightModeColors[`${colorName}-${shade}`]?.value;
                    const darkModeValue = darkModeColors[`${colorName}-${shade}`]?.value;
                    colorItems.push({
                        name: shade,
                        originalKey: `${colorName}-${shade}`,
                        lightColor: lightModeValue || '',
                        darkColor: darkModeValue || '',
                        line: {
                            config: config[`${colorName}-${shade}`]?.line,
                            css: {
                                lightMode: lightModeColors[`${colorName}-${shade}`]?.line,
                                darkMode: darkModeColors[`${colorName}-${shade}`]?.line,
                            },
                        },
                        override: true,
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
        shouldSaveToConfig: boolean = false,
    ) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            // For new colors, pass empty originalKey and parentName
            const originalKey = this.brandColors[groupName]?.[index]?.originalKey || '';

            // If is selected element, update the color in real-time
            // Base on the class name, find the styles to update

            // Only save to Tailwind config if explicitly requested
            if (shouldSaveToConfig) {
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

                // Force a theme refresh for all frames
                await Promise.all(
                    this.editorEngine.canvas.frames.map(async (frame) => {
                        const webview = this.editorEngine.webviews.getWebview(frame.id);
                        if (webview) {
                            await webview.executeJavaScript(
                                `window.api?.setTheme("${frame.theme}")`,
                            );

                            setTimeout(() => {
                                this.editorEngine.elements.refreshSelectedElements(webview);
                            }, 500);
                        }
                    }),
                );
            }
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

    get tailwindConfigPath() {
        return this.configPath;
    }

    get tailwindCssPath() {
        return this.cssPath;
    }

    getColorByName(colorName: string): string | undefined {
        const [groupName, shadeName] = colorName.split('-');

        const brandGroup = this.brandColors[groupName];
        if (brandGroup) {
            if (!shadeName || shadeName === 'DEFAULT') {
                const defaultColor = brandGroup.find((color) => color.name === 'DEFAULT');
                if (defaultColor?.lightColor) {
                    return defaultColor.lightColor;
                }
            } else {
                const color = brandGroup.find((color) => color.name === shadeName);
                if (color?.lightColor) {
                    return color.lightColor;
                }
            }
        }

        const defaultGroup = this.defaultColors[groupName];
        if (defaultGroup && shadeName) {
            const color = defaultGroup.find((color) => color.name === shadeName);
            if (color?.lightColor) {
                return color.lightColor;
            }
        }

        return undefined;
    }

    dispose() {
        this.brandColors = {};
        this.defaultColors = {};
    }
}

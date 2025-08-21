
import { DEFAULT_COLOR_NAME, TAILWIND_WEB_COLORS } from '@onlook/constants';
import type {
    ClassReplacement,
    ColorUpdate,
    ConfigUpdateResult,
    ParsedColors,
    ThemeColors,
    UpdateResult,
} from '@onlook/models/assets';
import { SystemTheme } from '@onlook/models/assets';
import type { CodeDiffRequest } from '@onlook/models/code';
import type { TailwindColor } from '@onlook/models/style';
import {
    generate,
    getAstFromContent,
    getNodeClasses,
    isColorsObjectProperty,
    isObjectExpression,
    transformAst,
    traverse
} from '@onlook/parser';
import { getOidFromJsxElement } from '@onlook/parser/src/code-edit/helpers';
import { Color } from '@onlook/utility';
import { camelCase } from 'lodash';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import {
    addTailwindCssVariable,
    addTailwindNestedColor,
    addTailwindRootColor,
    extractColorsFromTailwindConfig,
    extractTailwindCssVariables,
    isValidTailwindConfigProperty,
    modifyTailwindConfig,
    updateTailwindCssVariable,
} from './util';

interface ColorValue {
    value: string;
    line?: number;
}

export class ThemeManager {
    private brandColors: Record<string, TailwindColor[]> = {};
    private defaultColors: Record<string, TailwindColor[]> = {};
    private configPath: string | null = null;
    private cssPath: string | null = null;

    constructor(
        private editorEngine: EditorEngine,
    ) {
        makeAutoObservable(this);
    }

    async scanConfig() {
        try {
            const configResult = await this.scanTailwindConfig();

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
            const groups: Record<string, Set<string>> = {};

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

                        if (DEFAULT_COLOR_NAME in value) {
                            const varName = extractVarName(value.DEFAULT as string);
                            if (varName) {
                                parsed[key] = {
                                    name: key,
                                    lightMode: lightModeColors[varName]?.value ?? '',
                                    darkMode: darkModeColors[varName]?.value ?? '',
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
                                lightMode: lightModeColors[varName]?.value ?? '',
                                darkMode: darkModeColors[varName]?.value ?? '',
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
                const match = /var\(--([^)]+)\)/.exec(value);
                if (!match) {
                    return null;
                }
                const varName = match[1];
                if (!varName) {
                    return null;
                }
                return varName;
            };

            processConfigObject(config);

            // Convert groups to color items for UI
            const colorGroupsObj: Record<string, TailwindColor[]> = {};

            Object.entries(groups).forEach(([groupName, colorKeys]) => {
                if (colorKeys.size > 0) {
                    colorGroupsObj[groupName] = Array.from(colorKeys).map((key) => {
                        const color = parsed[key];
                        return {
                            name: key.includes('-') ? (key.split('-').pop() ?? key) : key,
                            originalKey: key,
                            lightColor: color?.lightMode ?? '',
                            darkColor: color?.darkMode ?? '',
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
                            name: DEFAULT_COLOR_NAME,
                            originalKey: `${key}-DEFAULT`,
                            lightColor: parsed[key]?.lightMode ?? '',
                            darkColor: parsed[key]?.darkMode ?? '',
                            line: parsed[key]?.line,
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
        const defaultColorsRecord: Record<string, TailwindColor[]> = {};

        Object.keys(TAILWIND_WEB_COLORS)
            .filter((colorName) => !excludedColors.includes(colorName))
            .forEach((colorName) => {
                const defaultColorScale = TAILWIND_WEB_COLORS[colorName as keyof typeof TAILWIND_WEB_COLORS];

                if (typeof defaultColorScale !== 'object' || defaultColorScale === null) {
                    return;
                }

                // Create color items for each shade in the scale
                const colorItems: TailwindColor[] = Object.entries(defaultColorScale)
                    .filter(([shade]) => shade !== DEFAULT_COLOR_NAME)
                    .map(([shade, defaultValue]) => {
                        const lightModeValue = lightModeColors[`${colorName}-${shade}`]?.value;
                        const darkModeValue = darkModeColors[`${colorName}-${shade}`]?.value;

                        return {
                            name: shade,
                            originalKey: `${colorName}-${shade}`,
                            lightColor: lightModeValue ?? String(defaultValue),
                            darkColor: darkModeValue ?? String(defaultValue),
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
                        name: shade ?? '',
                        originalKey: `${colorName}-${shade}`,
                        lightColor: lightModeValue ?? '',
                        darkColor: darkModeValue ?? '',
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
        try {
            await this.updateTailwindColorConfig(oldName, newName, SystemTheme.LIGHT);

            // Refresh colors after rename
            await this.scanConfig();
        } catch (error) {
            console.error('Error renaming color group:', error);
        }
    }

    async updateTailwindColorConfig(
        originalKey: string,
        newColor: string,
        newName: string,
        theme?: SystemTheme,
        parentName?: string,
    ): Promise<UpdateResult> {
        try {
            const colorUpdate = await this.initializeTailwindColorContent();
            if (!colorUpdate) {
                return { success: false, error: 'Failed to prepare color update' };
            }
            // Check if this is a default color update
            const camelCaseName = newName === DEFAULT_COLOR_NAME ? newName : camelCase(newName);

            if (originalKey) {
                const [parentKey, keyName] = originalKey.split('-');

                const isDefaultColor = parentKey && TAILWIND_WEB_COLORS[parentKey as keyof typeof TAILWIND_WEB_COLORS];
                if (isDefaultColor) {
                    const colorIndex = parseInt(keyName ?? '0') / 100;

                    await this.updateDefaultTailwindColor(
                        colorUpdate,
                        parentKey,
                        colorIndex,
                        newColor,
                        theme,
                    );
                    return { success: true };
                }
                return this.updateTailwindColorVariable(
                    colorUpdate,
                    originalKey,
                    newColor,
                    camelCaseName,
                    theme,
                );
            } else {
                return this.createTailwindColorVariable(
                    colorUpdate,
                    newColor,
                    camelCaseName,
                    parentName,
                );
            }
        } catch (error) {
            console.error('Error updating Tailwind config:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    async delete(groupName: string, colorName?: string) {
        try {
            const colorUpdate = await this.initializeTailwindColorContent();
            if (!colorUpdate) {
                return { success: false, error: 'Failed to prepare color update' };
            }

            const { configPath, cssPath, configContent, cssContent } = colorUpdate;

            const camelCaseName = camelCase(groupName);

            // Update config file
            const updateAst = getAstFromContent(configContent);
            if (!updateAst) {
                throw new Error(`Failed to parse file ${configPath}`);
            }

            traverse(updateAst, {
                ObjectProperty(path) {
                    if (isColorsObjectProperty(path)) {
                        const colorObj = path.node.value;
                        if (!isObjectExpression(colorObj)) {
                            return;
                        }

                        // Find the group
                        const groupProp = colorObj.properties.find((prop) =>
                            isValidTailwindConfigProperty(prop as any, camelCaseName),
                        );

                        if (groupProp && 'value' in groupProp) {
                            if (isObjectExpression(groupProp.value)) {
                                if (colorName) {
                                    // Delete specific color within group
                                    const colorIndex = groupProp.value.properties.findIndex(
                                        (prop) => isValidTailwindConfigProperty(prop as any, colorName),
                                    );

                                    if (colorIndex !== -1) {
                                        groupProp.value.properties.splice(colorIndex, 1);

                                        // If group is empty after deletion, remove the entire group
                                        if (groupProp.value.properties.length === 0) {
                                            const groupIndex =
                                                colorObj.properties.indexOf(groupProp);
                                            colorObj.properties.splice(groupIndex, 1);
                                        }
                                    }
                                } else {
                                    // Delete entire group
                                    const index = colorObj.properties.indexOf(groupProp);
                                    colorObj.properties.splice(index, 1);
                                }
                            } else {
                                // Delete entire group if it's direct value
                                const index = colorObj.properties.indexOf(groupProp);
                                colorObj.properties.splice(index, 1);
                            }
                        }
                    }
                },
            });

            // Update CSS file
            const cssLines = cssContent.split('\n');
            const updatedCssLines = cssLines.filter((line) => {
                const trimmedLine = line.trim();
                if (colorName) {
                    // Only remove the specific color variable
                    const shouldKeep = !trimmedLine.endsWith(`--${camelCaseName}-${colorName}`);
                    if (!shouldKeep) {
                        console.log('Removing CSS variable:', trimmedLine);
                    }
                    return shouldKeep;
                }
                // Remove all variables that start with the group name
                const shouldKeep = !trimmedLine.startsWith(`--${camelCaseName}`);
                if (!shouldKeep) {
                    console.log('Removing CSS variable:', trimmedLine);
                }
                return shouldKeep;
            });
            const updatedCssContent = updatedCssLines.join('\n');
            await this.editorEngine.sandbox.writeFile(cssPath, updatedCssContent);

            const output = generate(updateAst, {}, configContent).code;
            await this.editorEngine.sandbox.writeFile(configPath, output);

            // Also delete the color group in the class references
            const replacements: ClassReplacement[] = [];
            replacements.push({
                oldClass: camelCaseName,
                newClass: '',
            });
            await this.updateClassReferences(replacements);
            await this.scanConfig();

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    async update(
        groupName: string,
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
        theme?: SystemTheme,
        shouldSaveToConfig = false,
    ) {
        try {
            // For new colors, pass empty originalKey and parentName
            const originalGroupName = camelCase(groupName);
            const originalParentName = camelCase(parentName);

            const originalKey = this.brandColors[originalGroupName]?.[index]?.originalKey ?? '';

            // If is selected element, update the color in real-time
            // Base on the class name, find the styles to update

            // Only save to Tailwind config if explicitly requested
            if (shouldSaveToConfig) {
                await this.updateTailwindColorConfig(
                    originalKey,
                    newColor.toHex(),
                    newName,
                    theme,
                    originalParentName,
                );

                // Refresh colors after update
                await this.scanConfig();

                // // Force a theme refresh for all frames
                // await this.editorEngine.frames.reloadWebviews();
            }
        } catch (error) {
            console.error('Error updating color:', error);
        }
    }

    async add(newName: string) {
        if (!newName.trim()) {
            console.error('No color name provided');
            return;
        }
        try {
            await this.updateTailwindColorConfig('', '#FFFFFF', newName.trim());
            // Refresh colors
            await this.scanConfig();
        } catch (error) {
            console.error('Error adding color group:', error);
        }
    }

    async handleDefaultColorChange(
        colorFamily: string,
        index: number,
        newColor: Color,
        theme?: SystemTheme,
    ) {
        try {
            await this.updateTailwindColorConfig(
                `${colorFamily}-${index * 100}`,
                newColor.toHex(),
                '',
                theme,
            );

            // Refresh colors after update
            await this.scanConfig();
        } catch (error) {
            console.error('Error updating default color:', error);
        }
    }

    async duplicate(
        groupName: string,
        colorName: string,
        isDefaultPalette?: boolean,
        theme?: SystemTheme,
    ) {
        try {
            if (isDefaultPalette) {
                const colorToDuplicate = this.defaultColors[groupName];
                if (!colorToDuplicate || colorToDuplicate.length === 0) {
                    throw new Error('Color not found');
                }

                const colorIndex = colorToDuplicate.length;
                const newColor = colorToDuplicate[colorIndex - 1]?.lightColor;
                if (!newColor) {
                    throw new Error('Color not found');
                }

                const color = Color.from(newColor);

                await this.handleDefaultColorChange(groupName, colorIndex, color, theme);
            } else {
                const group = this.brandColors[groupName] ?? [];
                const colorToDuplicate = group.find((color) => color.name === colorName);

                if (!colorToDuplicate) {
                    throw new Error('Color not found');
                }

                const newName = `${colorName}Copy`;

                const color = Color.from(
                    theme === SystemTheme.DARK
                        ? (colorToDuplicate.darkColor ?? colorToDuplicate.lightColor)
                        : colorToDuplicate.lightColor,
                );

                await this.update(
                    groupName,
                    group.length,
                    color,
                    newName,
                    groupName.toLowerCase(),
                    theme,
                    true,
                );

                await this.scanConfig();
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

        if (!groupName) {
            return undefined;
        }

        const brandGroup = this.brandColors[groupName];
        if (brandGroup) {
            if (!shadeName || shadeName === DEFAULT_COLOR_NAME) {
                const defaultColor = brandGroup.find((color) => color.name === DEFAULT_COLOR_NAME);
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

    getConfigPath(): {
        configPath: string | null;
        cssPath: string | null;
    } {
        const list: string[] = this.editorEngine.sandbox.listAllFiles();

        if (!list.length) {
            return { configPath: null, cssPath: null };
        }

        const configPath = list.find((file: string) => file.includes('tailwind.config')) ?? null;
        const cssPath = list.find((file: string) => file.includes('globals.css')) ?? null;

        return { configPath, cssPath };
    }

    async scanTailwindConfig() {
        try {
            const { configPath, cssPath } = this.getConfigPath();

            if (!configPath || !cssPath) {
                return null;
            }

            const configFile = await this.editorEngine.sandbox.readFile(configPath);
            const cssFile = await this.editorEngine.sandbox.readFile(cssPath);
            const configContent = configFile && configFile.type === 'text' ? extractColorsFromTailwindConfig(configFile.content) : '';
            const cssContent = cssFile && cssFile.type === 'text' ? extractTailwindCssVariables(cssFile.content) : '';
            return {
                configPath,
                configContent,
                cssPath,
                cssContent,
            };
        } catch (error) {
            console.error('Error scanning Tailwind config:', error);
            return null;
        }
    }

    async updateDefaultTailwindColor(
        { configPath, cssPath, configContent, cssContent }: ColorUpdate,
        colorFamily: string,
        colorIndex: number,
        newColor: string,
        theme?: SystemTheme,
    ): Promise<boolean> {
        const updateAst = getAstFromContent(configContent);
        if (!updateAst) {
            throw new Error(`Failed to parse file ${configPath}`);
        }

        let isUpdated = false;
        // Update the specific shade base on tailwinds color scale
        // If the colorIndex is 0, we need + 50
        // If the colorIndex is 10, we need - 50
        const shadeKey =
            colorIndex * 100 + (colorIndex === 0 ? 50 : 0) + (colorIndex === 10 ? -50 : 0);
        const newColorValue = `var(--${colorFamily}-${shadeKey})`;

        // Update the default color in the config file
        traverse(updateAst, {
            ObjectProperty(path) {
                if (isColorsObjectProperty(path)) {
                    const colorObj = path.node.value;
                    if (!isObjectExpression(colorObj)) {
                        return;
                    }

                    // Find the color family object
                    const familyProp = colorObj.properties.find(
                        (prop) =>
                            prop.type === 'ObjectProperty' &&
                            'key' in prop &&
                            prop.key.type === 'Identifier' &&
                            prop.key.name === colorFamily,
                    );

                    // If the color family object is not found, create it
                    if (!familyProp) {
                        colorObj.properties.push({
                            type: 'ObjectProperty',
                            key: { type: 'Identifier', name: colorFamily },
                            value: {
                                type: 'ObjectExpression',
                                properties: [
                                    {
                                        type: 'ObjectProperty',
                                        key: { type: 'NumericLiteral', value: shadeKey },
                                        value: { type: 'StringLiteral', value: newColorValue },
                                        computed: false,
                                        shorthand: false,
                                    },
                                ],
                            },
                            computed: false,
                            shorthand: false,
                        });
                    } else if (
                        familyProp &&
                        'value' in familyProp &&
                        isObjectExpression(familyProp.value)
                    ) {
                        const shadeProp = familyProp.value.properties.find(
                            (prop) =>
                                prop.type === 'ObjectProperty' &&
                                'key' in prop &&
                                prop.key.type === 'NumericLiteral' &&
                                prop.key.value === shadeKey,
                        );

                        if (shadeProp && 'value' in shadeProp) {
                            // Marked updated to actually update the value in css file
                            isUpdated = true;
                        } else {
                            familyProp.value.properties.push({
                                type: 'ObjectProperty',
                                key: { type: 'NumericLiteral', value: shadeKey },
                                value: { type: 'StringLiteral', value: newColorValue },
                                computed: false,
                                shorthand: false,
                            });
                        }
                    }
                }
            },
        });

        const output = generate(updateAst, {}, configContent).code;
        await this.editorEngine.sandbox.writeFile(configPath, output);

        if (!isUpdated) {
            const newCssVarName = `${colorFamily}-${shadeKey}`;
            const updatedCssContent = await addTailwindCssVariable(
                cssContent,
                newCssVarName,
                newColor,
            );

            await this.editorEngine.sandbox.writeFile(cssPath, updatedCssContent);
        } else {
            // Update the CSS file
            const originalName = `${colorFamily}-${shadeKey}`;
            const updatedCssContent = await updateTailwindCssVariable(
                cssContent,
                originalName,
                undefined,
                newColor,
                theme,
            );
            await this.editorEngine.sandbox.writeFile(cssPath, updatedCssContent);
        }

        return isUpdated;
    }

    async updateTailwindColorVariable(
        { configPath, cssPath, configContent, cssContent }: ColorUpdate,
        originalName: string,
        newColor: string,
        newName: string,
        theme?: SystemTheme,
    ): Promise<UpdateResult> {
        const [parentKey, keyName] = originalName.split('-');

        if (!parentKey) {
            return {
                success: false,
                error: `Invalid color key format: ${originalName}`,
            };
        }
        let newCssVarName;
        // If the keyName is not provided, we are renaming the root color
        if (!keyName) {
            newCssVarName = newName !== parentKey ? `${newName}` : originalName;
        } else {
            // Special handling for DEFAULT
            if (keyName === DEFAULT_COLOR_NAME) {
                newCssVarName = parentKey;
                originalName = parentKey;
            } else {
                newCssVarName = newName !== keyName ? `${parentKey}-${newName}` : originalName;
            }
        }

        // Update CSS file
        const updatedCssContent = await updateTailwindCssVariable(
            cssContent,
            originalName,
            newCssVarName,
            newColor,
            theme,
        );

        await this.editorEngine.sandbox.writeFile(cssPath, updatedCssContent);

        // Update config file
        const { keyUpdated, valueUpdated, output } = this.updateTailwindConfigFile(
            configContent,
            parentKey,
            newName,
            newCssVarName,
            keyName,
        );

        if (keyUpdated || valueUpdated) {
            await this.editorEngine.sandbox.writeFile(configPath, output);

            // Update class references if the name changed
            if (keyUpdated) {
                const replacements: ClassReplacement[] = [];

                if (!keyName) {
                    replacements.push({
                        oldClass: parentKey,
                        newClass: newName,
                    });
                } else {
                    replacements.push({
                        oldClass: `${parentKey}-${keyName}`,
                        newClass: `${parentKey}-${newName}`,
                    });
                }

                await this.updateClassReferences(replacements);
            }
        } else {
            console.log(`Warning: Could not update key: ${keyName} in ${parentKey}`);
        }

        return { success: true };
    }

    async createTailwindColorVariable(
        { configPath, cssPath, configContent, cssContent }: ColorUpdate,
        newColor: string,
        newName: string,
        parentName?: string,
    ): Promise<UpdateResult> {
        const newCssVarName = parentName?.length ? `${parentName}-${newName}` : newName;

        // Check if CSS variable already exists
        const cssVariables = extractTailwindCssVariables(cssContent);

        if (cssVariables.root[newCssVarName] || cssVariables.dark[newCssVarName]) {
            return {
                success: false,
                error: `CSS variable --${newCssVarName} already exists`,
            };
        } else {
            // Variable doesn't exist, add it
            const updatedCssContent = await addTailwindCssVariable(
                cssContent,
                newCssVarName,
                newColor,
            );
            await this.editorEngine.sandbox.writeFile(cssPath, updatedCssContent);
        }

        // Update config file
        const updateAst = getAstFromContent(configContent);
        if (!updateAst) {
            throw new Error(`Failed to parse file ${configPath}`);
        }

        traverse(updateAst, {
            ObjectProperty(path) {
                if (isColorsObjectProperty(path)) {
                    const colorObj = path.node.value;
                    if (!isObjectExpression(colorObj)) {
                        return;
                    }

                    if (!parentName) {
                        addTailwindRootColor(colorObj as any, newName, newCssVarName);
                    } else {
                        addTailwindNestedColor(colorObj as any, parentName, newName, newCssVarName);
                    }
                }
            },
        });

        const output = generate(updateAst, { compact: false }, configContent).code;
        await this.editorEngine.sandbox.writeFile(configPath, output);

        return { success: true };
    }

    async initializeTailwindColorContent(): Promise<ColorUpdate | null> {
        const { configPath, cssPath } = this.getConfigPath();
        if (!configPath || !cssPath) {
            return null;
        }

        const files = await this.editorEngine.sandbox.readFiles([configPath, cssPath]);
        if (!files[configPath] || !files[cssPath]) {
            return null;
        }

        if (files[configPath].type === 'binary' || files[cssPath].type === 'binary') {
            throw new Error('Config or CSS file is a binary file');
        }

        return {
            configPath,
            cssPath,
            configContent: files[configPath].content,
            cssContent: files[cssPath].content,
        };
    }

    updateTailwindConfigFile(
        configContent: string,
        parentKey: string,
        newName: string,
        newCssVarName: string,
        keyName?: string,
    ): ConfigUpdateResult {
        let keyUpdated = false;
        let valueUpdated = false;

        const { output } = modifyTailwindConfig(configContent, {
            visitor: (path) => {
                if (isColorsObjectProperty(path)) {
                    const colorObj = path.node.value;
                    if (!isObjectExpression(colorObj)) {
                        return false;
                    }

                    colorObj.properties.forEach((colorProp) => {
                        if (this.isMatchingProperty(colorProp, parentKey)) {
                            // If the keyName is not provided, we are renaming the root color
                            if (!keyName) {
                                const updated = this.handleRootColorUpdate(
                                    colorProp,
                                    parentKey,
                                    newName,
                                );
                                keyUpdated = updated;
                            } else {
                                const result = this.handleNestedColorUpdate(
                                    colorProp,
                                    keyName,
                                    newName,
                                    newCssVarName,
                                );
                                keyUpdated = keyUpdated || result.keyUpdated;
                                valueUpdated = valueUpdated || result.valueUpdated;
                            }
                        }
                    });

                    return keyUpdated || valueUpdated;
                }
                return false;
            },
        });

        return { keyUpdated, valueUpdated, output };
    }

    private isMatchingProperty(prop: any, keyName: string): boolean {
        return (
            prop.type === 'ObjectProperty' &&
            (prop.key.type === 'Identifier' || prop.key.type === 'NumericLiteral') &&
            (prop.key.type === 'Identifier'
                ? prop.key.name === keyName
                : String(prop.key.value) === keyName)
        );
    }

    private handleRootColorUpdate(colorProp: any, parentKey: string, newName: string): boolean {
        if (parentKey && newName !== parentKey) {
            // Update the key name
            if (colorProp.key.type === 'Identifier') {
                colorProp.key.name = newName;
            } else {
                colorProp.key = {
                    type: 'Identifier',
                    name: newName,
                };
            }

            // Then update the child css variables or direct color values
            if (colorProp.value.type === 'ObjectExpression') {
                colorProp.value.properties.forEach((nestedProp: any) => {
                    if (
                        nestedProp.type === 'ObjectProperty' &&
                        (nestedProp.key.type === 'Identifier' ||
                            nestedProp.key.type === 'NumericLiteral') &&
                        nestedProp.value.type === 'StringLiteral'
                    ) {
                        // Special handling for DEFAULT
                        const keyValue =
                            nestedProp.key.type === 'Identifier'
                                ? nestedProp.key.name
                                : String(nestedProp.key.value);

                        const oldVarName =
                            keyValue === DEFAULT_COLOR_NAME
                                ? parentKey
                                : `${parentKey}-${keyValue}`;
                        const newVarName =
                            keyValue === DEFAULT_COLOR_NAME ? newName : `${newName}-${keyValue}`;

                        nestedProp.value.value = nestedProp.value.value.replace(
                            new RegExp(`--${oldVarName}`, 'g'),
                            `--${newVarName}`,
                        );
                    }
                });
            } else if (colorProp.value.type === 'StringLiteral') {
                colorProp.value.value = colorProp.value.value.replace(
                    new RegExp(`--${parentKey}`, 'g'),
                    `--${newName}`,
                );
            }

            return true;
        }

        return false;
    }

    private handleNestedColorUpdate(
        colorProp: any,
        keyName: string,
        newName: string,
        newCssVarName: string,
    ): { keyUpdated: boolean; valueUpdated: boolean } {
        let keyUpdated = false;
        let valueUpdated = false;

        const nestedObj = colorProp.value;
        if (!isObjectExpression(nestedObj)) {
            return { keyUpdated, valueUpdated };
        }

        nestedObj.properties.forEach((nestedProp) => {
            if (
                nestedProp.type === 'ObjectProperty' &&
                (nestedProp.key.type === 'Identifier' ||
                    nestedProp.key.type === 'NumericLiteral') &&
                ((nestedProp.key.type === 'Identifier' && nestedProp.key.name === keyName) ||
                    (nestedProp.key.type === 'NumericLiteral' &&
                        String(nestedProp.key.value) === keyName))
            ) {
                // Update key if name changed
                if (newName !== keyName) {
                    if (nestedProp.key.type === 'Identifier') {
                        nestedProp.key.name = newName;
                    } else if (nestedProp.key.type === 'NumericLiteral') {
                        nestedProp.key = {
                            type: 'Identifier',
                            name: newName,
                        };
                    }
                    keyUpdated = true;
                }

                // Update value
                if (nestedProp.value.type === 'StringLiteral') {
                    // Special handling for DEFAULT values
                    const varName =
                        keyName === DEFAULT_COLOR_NAME ? colorProp.key.name : newCssVarName;
                    nestedProp.value.value = `var(--${varName})`;
                    valueUpdated = true;
                }
            }
        });

        return { keyUpdated, valueUpdated };
    }

    async updateClassReferences(replacements: ClassReplacement[]): Promise<void> {
        const sourceFiles = this.editorEngine.sandbox.listAllFiles();
        const filesToUpdate = sourceFiles.filter((file) => file.endsWith('.tsx'))

        await Promise.all(
            filesToUpdate.map(async (file) => {
                const foundFile = await this.editorEngine.sandbox.readFile(file);
                if (!foundFile || foundFile.type === 'binary') {
                    return;
                }

                const ast = getAstFromContent(foundFile.content);
                if (!ast) {
                    throw new Error(`Failed to parse file ${file}`);
                }

                const updates = new Map<string, CodeDiffRequest>();

                traverse(ast, {
                    JSXElement(path) {
                        const classResult = getNodeClasses(path.node);
                        if (classResult.type !== 'classes') {
                            return;
                        }

                        const oldClasses = classResult.value;
                        let hasChanges = false;
                        const newClasses = oldClasses.map((currentClass) => {
                            for (const { oldClass, newClass } of replacements) {
                                const oldClassPattern = new RegExp(`(^|-)${oldClass}(-|$)`);
                                if (oldClassPattern.test(currentClass)) {
                                    hasChanges = true;
                                    return newClass ? currentClass.replace(oldClass, newClass) : '';
                                }
                            }
                            return currentClass;
                        });

                        if (hasChanges) {
                            const oid = getOidFromJsxElement(path.node.openingElement);
                            if (oid) {
                                updates.set(oid, {
                                    oid,
                                    attributes: { className: newClasses.join(' ') },
                                    overrideClasses: true,
                                    textContent: null,
                                    structureChanges: [],
                                });
                            }
                        }
                    },
                });

                if (updates.size > 0) {
                    transformAst(ast, updates);
                    const output = generate(ast, { retainLines: true }, foundFile.content).code;
                    await this.editorEngine.sandbox.writeFile(file, output);
                }
            }),
        );
    }

    clear() {
        this.brandColors = {};
        this.defaultColors = {};
    }
}

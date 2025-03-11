import generate from '@babel/generator';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { ObjectExpression, ObjectProperty } from '@babel/types';
import type {
    ClassReplacement,
    ColorUpdate,
    ConfigUpdateResult,
    UpdateResult,
} from '@onlook/models/assets';
import type { CodeDiffRequest } from '@onlook/models/code';
import { Color } from '@onlook/utility';
import fs from 'fs';
import path from 'path';
import { getNodeClasses } from '../code/classes';
import { getOidFromJsxElement } from '../code/diff/helpers';
import { transformAst } from '../code/diff/transform';
import { readFile } from '../code/files';
import {
    addTailwindRootColor,
    extractObject,
    findSourceFiles,
    getConfigPath,
    initializeTailwindColorContent,
    isColorsObjectProperty,
    isObjectExpression,
    toCamelCase,
} from './helpers';

export async function updateTailwindColorConfig(
    projectRoot: string,
    originalName: string,
    newColor: string,
    newName: string,
    theme?: 'dark' | 'light',
    parentName?: string,
): Promise<UpdateResult> {
    try {
        const colorUpdate = await initializeTailwindColorContent(projectRoot);
        if (!colorUpdate) {
            return { success: false, error: 'Failed to prepare color update' };
        }

        return originalName
            ? updateTailwindColorVariable(colorUpdate, originalName, newColor, newName, theme)
            : createTailwindColorVariable(colorUpdate, newColor, newName, parentName);
    } catch (error) {
        console.error('Error updating Tailwind config:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function addTailwindNestedColor(
    colorObj: ObjectExpression,
    parentName: string,
    newName: string,
    newCssVarName: string,
) {
    const parentColorObj = colorObj.properties.find(
        (prop): prop is ObjectProperty =>
            prop.type === 'ObjectProperty' &&
            'key' in prop &&
            prop.key.type === 'Identifier' &&
            prop.key.name === parentName,
    );

    if (parentColorObj && parentColorObj.value.type === 'ObjectExpression') {
        parentColorObj.value.properties.push({
            type: 'ObjectProperty',
            key: {
                type: 'Identifier',
                name: toCamelCase(newName),
            },
            value: {
                type: 'StringLiteral',
                value: `var(--${newCssVarName})`,
            },
            computed: false,
            shorthand: false,
        });
    }
}

async function createTailwindColorVariable(
    { configPath, cssPath, configContent, cssContent }: ColorUpdate,
    newColor: string,
    newName: string,
    parentName?: string,
): Promise<UpdateResult> {
    const camelCaseName = toCamelCase(newName);

    const newCssVarName = parentName?.length ? `${parentName}-${camelCaseName}` : camelCaseName;

    // Update CSS file
    const updatedCssContent = addTailwindCssVariable(cssContent, newCssVarName, newColor);
    fs.writeFileSync(cssPath, updatedCssContent);

    // Update config file
    const updateAst = parse(configContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    traverse(updateAst, {
        ObjectProperty(path) {
            if (isColorsObjectProperty(path)) {
                const colorObj = path.node.value;
                if (!isObjectExpression(colorObj)) {
                    return;
                }

                if (!parentName) {
                    addTailwindRootColor(colorObj, camelCaseName, newCssVarName);
                } else {
                    addTailwindNestedColor(colorObj, parentName, camelCaseName, newCssVarName);
                }
            }
        },
    });

    const output = generate(updateAst, { retainLines: true, compact: false }, configContent);
    fs.writeFileSync(configPath, output.code);

    return { success: true };
}

function updateTailwindConfigFile(
    configContent: string,
    parentKey: string,
    keyName: string,
    newName: string,
    newCssVarName: string,
): ConfigUpdateResult {
    const updateAst = parse(configContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let keyUpdated = false;
    let valueUpdated = false;

    traverse(updateAst, {
        ObjectProperty(path) {
            if (isColorsObjectProperty(path)) {
                const colorObj = path.node.value;
                if (!isObjectExpression(colorObj)) {
                    return;
                }

                colorObj.properties.forEach((colorProp) => {
                    if (
                        colorProp.type === 'ObjectProperty' &&
                        colorProp.key.type === 'Identifier' &&
                        colorProp.key.name === parentKey &&
                        colorProp.value.type === 'ObjectExpression'
                    ) {
                        // If the keyName is not provided, we are renaming the root color
                        if (!keyName) {
                            if (parentKey && newName !== parentKey) {
                                colorProp.key.name = toCamelCase(newName);
                                keyUpdated = true;

                                // Then we need to update the child css variables
                                if (colorProp.value.type === 'ObjectExpression') {
                                    colorProp.value.properties.forEach((nestedProp) => {
                                        if (
                                            nestedProp.type === 'ObjectProperty' &&
                                            nestedProp.key.type === 'Identifier' &&
                                            nestedProp.value.type === 'StringLiteral'
                                        ) {
                                            // Special handling for DEFAULT
                                            const oldVarName =
                                                nestedProp.key.name === 'DEFAULT'
                                                    ? parentKey
                                                    : `${parentKey}-${nestedProp.key.name}`;
                                            const newVarName =
                                                nestedProp.key.name === 'DEFAULT'
                                                    ? toCamelCase(newName)
                                                    : `${toCamelCase(newName)}-${nestedProp.key.name}`;

                                            nestedProp.value.value = nestedProp.value.value.replace(
                                                new RegExp(`--${oldVarName}`, 'g'),
                                                `--${newVarName}`,
                                            );
                                        }
                                    });
                                }
                            }
                        } else {
                            const nestedObj = colorProp.value;
                            nestedObj.properties.forEach((nestedProp) => {
                                if (
                                    nestedProp.type === 'ObjectProperty' &&
                                    nestedProp.key.type === 'Identifier' &&
                                    nestedProp.key.name === keyName
                                ) {
                                    if (newName !== keyName) {
                                        nestedProp.key.name = toCamelCase(newName);
                                        keyUpdated = true;
                                    }

                                    if (nestedProp.value.type === 'StringLiteral') {
                                        // Special handling for DEFAULT values
                                        const varName =
                                            keyName === 'DEFAULT' ? parentKey : newCssVarName;
                                        nestedProp.value.value = `var(--${varName})`;
                                        valueUpdated = true;
                                    }
                                }
                            });
                        }
                    }
                });
            }
        },
    });

    const output = generate(updateAst, { retainLines: true, compact: false }, configContent).code;
    return { keyUpdated, valueUpdated, output };
}

async function updateTailwindColorVariable(
    { configPath, cssPath, configContent, cssContent }: ColorUpdate,
    originalName: string,
    newColor: string,
    newName: string,
    theme?: 'dark' | 'light',
): Promise<UpdateResult> {
    const [parentKey, keyName] = originalName.split('-');

    if (!parentKey) {
        return { success: false, error: `Invalid color key format: ${originalName}` };
    }
    let newCssVarName;
    // If the keyName is not provided, we are renaming the root color
    if (!keyName) {
        newCssVarName = newName !== parentKey ? `${newName}` : originalName;
    } else {
        // Special handling for DEFAULT
        if (keyName === 'DEFAULT') {
            newCssVarName = parentKey;
            originalName = parentKey;
        } else {
            newCssVarName = newName !== keyName ? `${parentKey}-${newName}` : originalName;
        }
    }

    // Update CSS file
    const updatedCssContent = updateTailwindCssVariable(
        cssContent,
        originalName,
        newCssVarName,
        newColor,
        theme,
    );

    fs.writeFileSync(cssPath, updatedCssContent);

    // Update config file
    const { keyUpdated, valueUpdated, output } = updateTailwindConfigFile(
        configContent,
        parentKey,
        keyName,
        newName,
        newCssVarName,
    );

    if (keyUpdated || valueUpdated) {
        fs.writeFileSync(configPath, output);

        // Update class references if the name changed
        if (keyUpdated) {
            const projectRoot = path.dirname(configPath);
            const oldClass = `${parentKey}-${keyName}`;
            const newClass = `${parentKey}-${newName}`;

            await updateClassReferences(projectRoot, [
                {
                    oldClass,
                    newClass,
                },
            ]);
        }
    } else {
        console.log(`Warning: Could not update key: ${keyName} in ${parentKey}`);
    }

    return { success: true };
}

function addTailwindCssVariable(cssContent: string, varName: string, color: string): string {
    const cssVarAddition = `\n    --${varName}: ${color};`;

    let updatedContent = cssContent;

    // Add to both light and dark themes
    const baseLayerRegex =
        /(@layer\s+base\s*{)([^}]*:root\s*{[^}]*})\s*([^}]*\.dark\s*{[^}]*})\s*}/s;

    if (baseLayerRegex.test(cssContent)) {
        updatedContent = cssContent.replace(
            baseLayerRegex,
            (match, layerStart, rootBlock, darkBlock) => {
                // Add to root block
                const updatedRootBlock = rootBlock.replace(/}$/, `${cssVarAddition}\n  }`);
                // Add to dark block
                const updatedDarkBlock = darkBlock.replace(/}$/, `${cssVarAddition}\n  }`);

                return `${layerStart}${updatedRootBlock}\n  ${updatedDarkBlock}\n}`;
            },
        );
    }

    return updatedContent;
}

function updateTailwindCssVariable(
    cssContent: string,
    originalName: string,
    newVarName: string,
    newColor: string,
    theme?: 'dark' | 'light',
): string {
    // Constants for CSS selectors and patterns
    const CSS_ROOT_SELECTOR = ':root';
    const CSS_DARK_SELECTOR = '.dark';
    const CSS_LAYER_BASE = '@layer base';

    // More specific and readable regex patterns
    const lightVarRegex = new RegExp(
        `(${CSS_ROOT_SELECTOR}[^{]*{[^}]*)` + // Capture the :root block start
            `(--${originalName}\\s*:\\s*[^;]*)` + // Capture the CSS variable declaration
            `(;|})`, // Capture the ending
        's',
    );

    const darkVarRegex = new RegExp(
        `(${CSS_LAYER_BASE}\\s*{\\s*` + // Match @layer base opening
            `${CSS_DARK_SELECTOR}\\s*{[^}]*)` + // Match .dark block content
            `(})`, // Capture the ending
        's',
    );

    const regex = theme === 'dark' ? darkVarRegex : lightVarRegex;
    let updatedContent = cssContent;

    // First update the main variable
    if (regex.test(cssContent)) {
        updatedContent =
            newVarName !== originalName
                ? cssContent.replace(
                      regex,
                      `$1--${originalName}: ${newColor};--${newVarName}: ${newColor}$3`,
                  )
                : cssContent.replace(regex, `$1--${originalName}: ${newColor}$3`);
    } else {
        updatedContent = addTailwindCssVariable(cssContent, newVarName, newColor);
    }

    if (newVarName !== originalName) {
        const VAR_PATTERN = '--';

        // Update the base/DEFAULT variable if it exists
        const baseVarRegex = new RegExp(`${VAR_PATTERN}${originalName}\\s*:`, 'g');
        updatedContent = updatedContent.replace(baseVarRegex, `${VAR_PATTERN}${newVarName}:`);

        // Update nested variables
        const nestedVarRegex = new RegExp(`${VAR_PATTERN}${originalName}-([^:\\s]+)\\s*:`, 'g');
        updatedContent = updatedContent.replace(
            nestedVarRegex,
            (_, suffix) => `${VAR_PATTERN}${newVarName}-${suffix}:`,
        );
    }

    return updatedContent;
}

export async function scanTailwindConfig(projectRoot: string) {
    try {
        const { configPath, cssPath } = getConfigPath(projectRoot);

        if (!configPath || !cssPath) {
            return null;
        }

        const configContent = await readFile(configPath);
        if (!configContent) {
            console.log('Could not read Tailwind config file');
            return null;
        }

        const cssContent = await readFile(cssPath);
        if (!cssContent) {
            console.log('Could not read CSS file');
            return {
                configPath,
                configContent: extractColorsFromTailwindConfig(configContent),
                cssPath,
                cssContent: extractTailwindCssVariables(''),
            };
        }

        return {
            configPath,
            configContent: extractColorsFromTailwindConfig(configContent),
            cssPath,
            cssContent: extractTailwindCssVariables(cssContent),
        };
    } catch (error) {
        console.error('Error scanning Tailwind config:', error);
        return null;
    }
}

function extractTailwindCssVariables(content: string) {
    try {
        const configs: {
            root: Record<string, string>;
            dark: Record<string, string>;
        } = {
            root: {},
            dark: {},
        };

        const parseBlock = (selector: string): Record<string, string> => {
            const blockRegex = new RegExp(`${selector}\\s*{([^}]+)}`, 'g');
            const matches = [...content.matchAll(blockRegex)];

            const result: Record<string, string> = {};

            for (const match of matches) {
                if (match[1]) {
                    const cssVarMatches = [...match[1].matchAll(/--([^:]+):\s*([^;]+);/g)];

                    for (const varMatch of cssVarMatches) {
                        const varName = varMatch[1].trim();
                        const value = varMatch[2].trim();

                        if (
                            value.includes('hsl') ||
                            value.match(/\d+\.?\d*\s+\d+\.?\d*%\s+\d+\.?\d*%/)
                        ) {
                            try {
                                let h = 0,
                                    s = 0,
                                    l = 0,
                                    a = 1;

                                if (value.includes('hsl')) {
                                    // Handle both hsl() and hsla() formats
                                    const hslMatch = value.match(
                                        /hsla?\(\s*([^,\s]+)(?:deg)?\s*[,\s]\s*([^,\s]+)%\s*[,\s]\s*([^,\s]+)%\s*(?:[,/]\s*([^)]+))?\s*\)/,
                                    );

                                    if (hslMatch) {
                                        // Parse hue (supports deg, turn, rad, grad)
                                        const hueValue = hslMatch[1];
                                        if (hueValue.endsWith('turn')) {
                                            h = parseFloat(hueValue) * 360;
                                        } else if (hueValue.endsWith('rad')) {
                                            h = parseFloat(hueValue) * (180 / Math.PI);
                                        } else if (hueValue.endsWith('grad')) {
                                            h = parseFloat(hueValue) * 0.9;
                                        } else {
                                            h = parseFloat(hueValue);
                                        }

                                        s = parseFloat(hslMatch[2]);
                                        l = parseFloat(hslMatch[3]);

                                        if (hslMatch[4]) {
                                            a = hslMatch[4].endsWith('%')
                                                ? parseFloat(hslMatch[4]) / 100
                                                : parseFloat(hslMatch[4]);
                                        }
                                    }
                                } else {
                                    // Handle space-separated format (e.g. "210 40% 98%")
                                    const parts = value.split(/\s+/);
                                    if (parts.length >= 3) {
                                        h = parseFloat(parts[0]);
                                        s = parseFloat(parts[1].replace('%', ''));
                                        l = parseFloat(parts[2].replace('%', ''));

                                        // Handle optional alpha value
                                        if (parts.length >= 4) {
                                            a = parts[3].endsWith('%')
                                                ? parseFloat(parts[3]) / 100
                                                : parseFloat(parts[3]);
                                        }
                                    }
                                }

                                // Normalize values to valid ranges
                                h = ((h % 360) + 360) % 360;
                                s = Math.max(0, Math.min(100, s));
                                l = Math.max(0, Math.min(100, l));
                                a = Math.max(0, Math.min(1, a));

                                result[varName] = Color.hsl({
                                    h: h / 360,
                                    s: s / 100,
                                    l: l / 100,
                                    a,
                                }).toHex();
                            } catch (err) {
                                console.error(`Failed to convert HSL value: ${value}`, err);
                                result[varName] = value;
                            }
                        } else {
                            result[varName] = value;
                        }
                    }
                }
            }

            return result;
        };

        configs.root = parseBlock(':root');
        configs.dark = parseBlock('\\.dark');

        return configs;
    } catch (error) {
        console.error('Error extracting CSS config:', error);
        return { root: {}, dark: {} };
    }
}

function extractColorsFromTailwindConfig(fileContent: string): Record<string, any> {
    try {
        const ast = parse(fileContent, {
            sourceType: 'module',
            plugins: ['typescript'],
        });

        let colors: Record<string, any> = {};

        traverse(ast, {
            ObjectExpression(path) {
                path.node.properties.forEach((prop) => {
                    if (
                        prop.type === 'ObjectProperty' &&
                        prop.key.type === 'Identifier' &&
                        prop.key.name === 'theme'
                    ) {
                        const theme = prop.value;
                        if (theme.type === 'ObjectExpression') {
                            theme.properties.forEach((themeProp) => {
                                if (
                                    themeProp.type === 'ObjectProperty' &&
                                    themeProp.key.type === 'Identifier' &&
                                    themeProp.key.name === 'extend'
                                ) {
                                    const extend = themeProp.value;
                                    if (extend.type === 'ObjectExpression') {
                                        extend.properties.forEach((extendProp) => {
                                            if (
                                                extendProp.type === 'ObjectProperty' &&
                                                extendProp.key.type === 'Identifier' &&
                                                extendProp.key.name === 'colors'
                                            ) {
                                                colors = extractObject(extendProp.value);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                });
            },
        });

        return colors;
    } catch (error) {
        console.error('Error parsing Tailwind config:', error);
        return {};
    }
}

async function updateClassReferences(
    projectRoot: string,
    replacements: ClassReplacement[],
): Promise<void> {
    const sourceFiles = await findSourceFiles(projectRoot);

    await Promise.all(
        sourceFiles.map(async (file) => {
            const content = await readFile(file);
            if (!content) {
                return;
            }

            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

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
                        // For each replacement, check if the current class ends with the old class name
                        // and replace only that part while preserving any prefix
                        for (const { oldClass, newClass } of replacements) {
                            if (
                                currentClass === oldClass ||
                                currentClass.endsWith(`-${oldClass}`)
                            ) {
                                hasChanges = true;
                                return currentClass.replace(oldClass, newClass);
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
                const output = generate(ast, { retainLines: true }, content);
                await fs.promises.writeFile(file, output.code, 'utf8');
            }
        }),
    );
}

async function deleteColorGroup(
    { configPath, cssPath, configContent, cssContent }: ColorUpdate,
    groupName: string,
    colorName?: string,
): Promise<UpdateResult> {
    const camelCaseName = toCamelCase(groupName);

    // Update config file
    const updateAst = parse(configContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    traverse(updateAst, {
        ObjectProperty(path) {
            if (isColorsObjectProperty(path)) {
                const colorObj = path.node.value;
                if (!isObjectExpression(colorObj)) {
                    return;
                }

                // Find the group
                const groupProp = colorObj.properties.find(
                    (prop) =>
                        prop.type === 'ObjectProperty' &&
                        'key' in prop &&
                        prop.key.type === 'Identifier' &&
                        prop.key.name === camelCaseName,
                );

                if (groupProp && 'value' in groupProp && isObjectExpression(groupProp.value)) {
                    if (colorName) {
                        // Delete specific color within group
                        const colorIndex = groupProp.value.properties.findIndex(
                            (prop) =>
                                prop.type === 'ObjectProperty' &&
                                'key' in prop &&
                                prop.key.type === 'Identifier' &&
                                prop.key.name === colorName,
                        );

                        if (colorIndex !== -1) {
                            groupProp.value.properties.splice(colorIndex, 1);

                            // If group is empty after deletion, remove the entire group
                            if (groupProp.value.properties.length === 0) {
                                const groupIndex = colorObj.properties.indexOf(groupProp);
                                colorObj.properties.splice(groupIndex, 1);
                            }
                        }
                    } else {
                        // Delete entire group
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
            const shouldKeep = !trimmedLine.startsWith(`--${camelCaseName}-${colorName}`);
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

    fs.writeFileSync(cssPath, updatedCssContent);
    const output = generate(updateAst, { retainLines: true, compact: false }, configContent);
    fs.writeFileSync(configPath, output.code);

    return { success: true };
}

export async function deleteTailwindColorGroup(
    projectRoot: string,
    groupName: string,
    colorName?: string,
): Promise<UpdateResult> {
    try {
        const colorUpdate = await initializeTailwindColorContent(projectRoot);
        if (!colorUpdate) {
            return { success: false, error: 'Failed to prepare color update' };
        }

        return deleteColorGroup(colorUpdate, groupName, colorName);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

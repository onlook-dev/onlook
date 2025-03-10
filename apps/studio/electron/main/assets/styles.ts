import path from 'path';
import fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { Color } from '@onlook/utility';
import { readFile } from '../code/files';
import type { ObjectProperty, ObjectExpression, Node } from '@babel/types';
import { transformAst } from '../code/diff/transform';
import type { CodeDiffRequest } from '@onlook/models/code';
import { getOidFromJsxElement } from '../code/diff/helpers';
import { getNodeClasses } from '../code/classes';
import fg from 'fast-glob';

interface UpdateResult {
    success: boolean;
    error?: string;
}

interface ColorUpdate {
    configPath: string;
    cssPath: string;
    configContent: string;
    cssContent: string;
}

interface ConfigUpdateResult {
    keyUpdated: boolean;
    valueUpdated: boolean;
    output: string;
}

interface ClassReplacement {
    oldClass: string;
    newClass: string;
}

function toCamelCase(str: string): string {
    return str
        .toLowerCase()
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (letter, index) =>
            index === 0 ? letter.toLowerCase() : letter.trim() ? letter.toUpperCase() : '',
        );
}

export async function updateTailwindConfig(
    projectRoot: string,
    originalName: string,
    newColor: string,
    newName: string,
    theme?: 'dark' | 'light',
    parentName?: string,
): Promise<UpdateResult> {
    try {
        const colorUpdate = await prepareColorUpdate(projectRoot);
        if (!colorUpdate) {
            return { success: false, error: 'Failed to prepare color update' };
        }

        return originalName
            ? updateExistingColor(colorUpdate, originalName, newColor, newName, theme)
            : addNewColor(colorUpdate, newColor, newName, parentName);
    } catch (error) {
        console.error('Error updating Tailwind config:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function prepareColorUpdate(projectRoot: string): Promise<ColorUpdate | null> {
    const { configPath, cssPath } = getConfigPath(projectRoot);
    if (!configPath || !cssPath) {
        return null;
    }

    const configContent = await readFile(configPath);
    const cssContent = await readFile(cssPath);
    if (!configContent || !cssContent) {
        return null;
    }

    return { configPath, cssPath, configContent, cssContent };
}

function isColorsObjectProperty(path: any): boolean {
    return (
        path.parent.type === 'ObjectExpression' &&
        path.node.key.type === 'Identifier' &&
        path.node.key.name === 'colors' &&
        path.node.value.type === 'ObjectExpression'
    );
}

function isObjectExpression(node: any): node is ObjectExpression {
    return node.type === 'ObjectExpression';
}

function addRootColorProperty(colorObj: ObjectExpression, newName: string, newCssVarName: string) {
    colorObj.properties.push({
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

function addNestedColorProperty(
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

async function addNewColor(
    { configPath, cssPath, configContent, cssContent }: ColorUpdate,
    newColor: string,
    newName: string,
    parentName?: string,
): Promise<UpdateResult> {
    const camelCaseName = toCamelCase(newName);

    const newCssVarName = parentName?.length ? `${parentName}-${camelCaseName}` : camelCaseName;

    // Update CSS file
    const updatedCssContent = addNewCssVariable(cssContent, newCssVarName, newColor);
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
                    colorObj.properties.push({
                        type: 'ObjectProperty',
                        key: {
                            type: 'Identifier',
                            name: camelCaseName,
                        },
                        value: {
                            type: 'ObjectExpression',
                            properties: [
                                {
                                    type: 'ObjectProperty',
                                    key: {
                                        type: 'Identifier',
                                        name: 'DEFAULT',
                                    },
                                    value: {
                                        type: 'StringLiteral',
                                        value: `var(--${newCssVarName})`,
                                    },
                                    computed: false,
                                    shorthand: false,
                                },
                            ],
                        },
                        computed: false,
                        shorthand: false,
                    });
                } else {
                    addNestedColorProperty(colorObj, parentName, camelCaseName, newCssVarName);
                }
            }
        },
    });

    const output = generate(updateAst, { retainLines: true, compact: false }, configContent);
    fs.writeFileSync(configPath, output.code);

    return { success: true };
}

function updateConfigFile(
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
                                            // Handle both DEFAULT and regular nested properties
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
                                        nestedProp.value.value = `var(--${newCssVarName})`;
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

async function updateExistingColor(
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
        newCssVarName = newName !== keyName ? `${parentKey}-${newName}` : originalName;
    }

    // Update CSS file
    const updatedCssContent = updateCssVariable(
        cssContent,
        originalName,
        newCssVarName,
        newColor,
        theme,
    );
    fs.writeFileSync(cssPath, updatedCssContent);

    // Update config file
    const { keyUpdated, valueUpdated, output } = updateConfigFile(
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

function addNewCssVariable(cssContent: string, varName: string, color: string): string {
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

function updateCssVariable(
    cssContent: string,
    originalName: string,
    newVarName: string,
    newColor: string,
    theme?: 'dark' | 'light',
): string {
    const lightVarRegex = new RegExp(
        `(:root[^{]*{[^}]*)(--${originalName}\\s*:\\s*[^;]*)(;|})`,
        's',
    );
    const darkVarRegex = new RegExp(`(@layer\\s+base\\s*{\\s*\\.dark\\s*{[^}]*)(})`, 's');

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
        updatedContent = addNewCssVariable(cssContent, newVarName, newColor);
    }

    if (newVarName !== originalName) {
        // First update the base/DEFAULT variable if it exists
        updatedContent = updatedContent.replace(
            new RegExp(`--${originalName}\\s*:`, 'g'),
            `--${newVarName}:`,
        );

        // Then update any nested variables
        const nestedVarRegex = new RegExp(`--${originalName}-([^:\\s]+)\\s*:`, 'g');
        updatedContent = updatedContent.replace(nestedVarRegex, (match, suffix) => {
            return `--${newVarName}-${suffix}:`;
        });
    }

    return updatedContent;
}

function getConfigPath(projectRoot: string): { configPath: string | null; cssPath: string | null } {
    const possiblePaths = [
        path.join(projectRoot, 'tailwind.config.js'),
        path.join(projectRoot, 'tailwind.config.ts'),
        path.join(projectRoot, 'tailwind.config.cjs'),
        path.join(projectRoot, 'tailwind.config.mjs'),
    ];

    let configPath = null;
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            configPath = filePath;
            break;
        }
    }

    if (!configPath) {
        console.log('No Tailwind config file found');
        return { configPath: null, cssPath: null };
    }

    const possibleCssPaths = [
        path.join(projectRoot, 'app/globals.css'),
        path.join(projectRoot, 'src/app/globals.css'),
        path.join(projectRoot, 'styles/globals.css'),
        path.join(projectRoot, 'src/styles/globals.css'),
    ];

    let cssPath = null;
    for (const filePath of possibleCssPaths) {
        if (fs.existsSync(filePath)) {
            cssPath = filePath;
            break;
        }
    }

    if (!cssPath) {
        console.log('No globals.css file found');
        return { configPath, cssPath: null };
    }

    return { configPath, cssPath };
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
                cssContent: extractCssConfig(''),
            };
        }

        return {
            configPath,
            configContent: extractColorsFromTailwindConfig(configContent),
            cssPath,
            cssContent: extractCssConfig(cssContent),
        };
    } catch (error) {
        console.error('Error scanning Tailwind config:', error);
        return null;
    }
}

function extractCssConfig(content: string) {
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

                        if (value.includes('hsl') || value.match(/\d+\s+\d+%\s+\d+%/)) {
                            try {
                                let h = 0,
                                    s = 0,
                                    l = 0,
                                    a = 1;

                                if (value.includes('hsl')) {
                                    const hslMatch = value.match(
                                        /hsl\w*\(\s*([^,]+)[,\s]+([^,]+)[,\s]+([^,)]+)/,
                                    );
                                    if (hslMatch) {
                                        h = parseFloat(hslMatch[1].replace('deg', ''));
                                        s = parseFloat(hslMatch[2].replace('%', ''));
                                        l = parseFloat(hslMatch[3].replace('%', ''));
                                    }
                                } else {
                                    const parts = value.split(/\s+/);
                                    if (parts.length >= 3) {
                                        h = parseFloat(parts[0]);
                                        s = parseFloat(parts[1].replace('%', ''));
                                        l = parseFloat(parts[2].replace('%', ''));
                                    }
                                }

                                result[varName] = Color.hsl({
                                    h: h / 360,
                                    s: s / 100,
                                    l: l / 100,
                                    a,
                                }).toHex();
                            } catch (err) {
                                console.error(`Failed to convert HSL value: ${value}`, err);
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

function extractObject(node: Node): Record<string, any> {
    if (node.type !== 'ObjectExpression') {
        return {};
    }

    const result: Record<string, any> = {};
    node.properties.forEach((prop: any) => {
        if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
            if (prop.value.type === 'StringLiteral') {
                result[prop.key.name] = prop.value.value;
            } else if (prop.value.type === 'ObjectExpression') {
                result[prop.key.name] = extractObject(prop.value);
            }
        }
    });

    return result;
}

async function findSourceFiles(projectRoot: string): Promise<string[]> {
    const pattern = path.join(projectRoot, '**/*.{ts,tsx,js,jsx}');
    return fg
        .sync(pattern)
        .filter(
            (file: string) =>
                !file.includes('node_modules') &&
                !file.includes('dist') &&
                !file.includes('.next') &&
                !file.includes('build'),
        );
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
    console.log('Starting delete operation:', { groupName, colorName });
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

                console.log('Found group:', {
                    groupName: camelCaseName,
                    exists: !!groupProp,
                    isObjectExpression:
                        groupProp && 'value' in groupProp && isObjectExpression(groupProp.value),
                });

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

                        console.log('Found color:', {
                            colorName,
                            index: colorIndex,
                            groupProperties: groupProp.value.properties.map((p) =>
                                p.type === 'ObjectProperty' &&
                                'key' in p &&
                                p.key.type === 'Identifier'
                                    ? p.key.name
                                    : 'unknown',
                            ),
                        });

                        if (colorIndex !== -1) {
                            groupProp.value.properties.splice(colorIndex, 1);
                            console.log('Deleted color from group');

                            // If group is empty after deletion, remove the entire group
                            if (groupProp.value.properties.length === 0) {
                                const groupIndex = colorObj.properties.indexOf(groupProp);
                                colorObj.properties.splice(groupIndex, 1);
                                console.log('Removed empty group');
                            }
                        }
                    } else {
                        // Delete entire group
                        const index = colorObj.properties.indexOf(groupProp);
                        colorObj.properties.splice(index, 1);
                        console.log('Deleted entire group');
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

    // Write the updated files
    fs.writeFileSync(cssPath, updatedCssContent);
    const output = generate(updateAst, { retainLines: true, compact: false }, configContent);
    fs.writeFileSync(configPath, output.code);

    console.log('Delete operation completed successfully');
    return { success: true };
}

export async function deleteTailwindColorGroup(
    projectRoot: string,
    groupName: string,
    colorName?: string,
): Promise<UpdateResult> {
    try {
        const colorUpdate = await prepareColorUpdate(projectRoot);
        if (!colorUpdate) {
            return { success: false, error: 'Failed to prepare color update' };
        }

        return deleteColorGroup(colorUpdate, groupName, colorName);
    } catch (error) {
        console.error('Error deleting color:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

import path from 'path';
import fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { Color } from '@onlook/utility';
import { readFile } from '../code/files';
import type { ObjectProperty, ObjectExpression, Node } from '@babel/types';

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

export async function updateTailwindConfig(
    projectRoot: string,
    originalName: string,
    newColor: string,
    newName: string,
    parentName?: string,
): Promise<UpdateResult> {
    try {
        const colorUpdate = await prepareColorUpdate(projectRoot);
        if (!colorUpdate) {
            return { success: false, error: 'Failed to prepare color update' };
        }

        return originalName
            ? updateExistingColor(colorUpdate, originalName, newColor, newName)
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
            name: newName.toLowerCase(),
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
                name: newName.toLowerCase(),
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
    const newCssVarName = parentName?.length
        ? `${parentName}-${newName.toLowerCase()}`
        : newName.toLowerCase();

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
                    addRootColorProperty(colorObj, newName, newCssVarName);
                } else {
                    addNestedColorProperty(colorObj, parentName, newName, newCssVarName);
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
                        const nestedObj = colorProp.value;
                        nestedObj.properties.forEach((nestedProp) => {
                            if (
                                nestedProp.type === 'ObjectProperty' &&
                                nestedProp.key.type === 'Identifier' &&
                                nestedProp.key.name === keyName
                            ) {
                                if (newName !== keyName) {
                                    nestedProp.key.name = newName;
                                    keyUpdated = true;
                                }

                                if (nestedProp.value.type === 'StringLiteral') {
                                    nestedProp.value.value = `var(--${newCssVarName})`;
                                    valueUpdated = true;
                                }
                            }
                        });
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
): Promise<UpdateResult> {
    const [parentKey, keyName] = originalName.split('-');
    if (!parentKey || !keyName) {
        return { success: false, error: `Invalid color key format: ${originalName}` };
    }

    const newCssVarName = newName !== keyName ? `${parentKey}-${newName}` : originalName;

    // Update CSS file
    const updatedCssContent = updateCssVariable(cssContent, originalName, newCssVarName, newColor);
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
    } else {
        console.log(`Warning: Could not update key: ${keyName} in ${parentKey}`);
    }

    return { success: true };
}

function addNewCssVariable(cssContent: string, varName: string, color: string): string {
    const cssVarAddition = `\n    --${varName}: ${color};`;
    return cssContent.replace(/(@layer\s*base\s*{\s*:root\s*{[^}]*)(})/, `$1${cssVarAddition}$2`);
}

function updateCssVariable(
    cssContent: string,
    originalName: string,
    newVarName: string,
    newColor: string,
): string {
    const lightVarRegex = new RegExp(
        `(:root[^{]*{[^}]*)(--${originalName}\\s*:\\s*[^;]*)(;|})`,
        's',
    );

    if (lightVarRegex.test(cssContent)) {
        return newVarName !== originalName
            ? cssContent.replace(
                  lightVarRegex,
                  `$1--${originalName}: ${newColor};--${newVarName}: ${newColor}$3`,
              )
            : cssContent.replace(lightVarRegex, `$1--${originalName}: ${newColor}$3`);
    }

    return addNewCssVariable(cssContent, newVarName, newColor);
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

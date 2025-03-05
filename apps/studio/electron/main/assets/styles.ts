import path from 'path';
import fs from 'fs';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { Color } from '@onlook/utility';
import { readFile } from '../code/files';
import type { ObjectProperty } from '@babel/types';

export async function updateTailwindConfig(
    projectRoot: string,
    originalName: string,
    newColor: string,
    newName: string,
    parentName?: string,
) {
    try {
        const { configPath, cssPath } = getConfigPath(projectRoot);
        if (!configPath || !cssPath) {
            return { success: false, error: 'Config or CSS file not found' };
        }

        const configContent = await readFile(configPath);
        if (!configContent) {
            return { success: false, error: 'Failed to read config file' };
        }

        const cssContent = await readFile(cssPath);
        if (!cssContent) {
            return { success: false, error: 'Failed to read CSS file' };
        }

        // If not have an original key, it means we are adding a new color
        if (!originalName) {
            // Add new CSS variable
            // We need to add the new color to the CSS file and the config file\
            // If parentName is not provided, it means we are adding a new color to the root
            // If parentName is provided, it means we are adding a new color to the parent

            let newCssVarName = newName.toLowerCase();

            if (parentName?.length) {
                newCssVarName = `${parentName}-${newName.toLowerCase()}`;
            }

            const cssVarAddition = `\n    --${newCssVarName}: ${newColor};`;

            // Add to :root block inside @layer base block
            const updatedCssContent = cssContent.replace(
                /(@layer\s*base\s*{\s*:root\s*{[^}]*)(})/,
                `$1${cssVarAddition}$2`,
            );

            fs.writeFileSync(cssPath, updatedCssContent);

            // Update config file
            const updateAst = parse(configContent, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            traverse(updateAst, {
                ObjectProperty(path) {
                    if (
                        path.parent.type === 'ObjectExpression' &&
                        path.node.key.type === 'Identifier' &&
                        path.node.key.name === 'colors' &&
                        path.node.value.type === 'ObjectExpression'
                    ) {
                        const colorObj = path.node.value;
                        // Add new color property
                        // If parentName is not provided, add to the root

                        if (!parentName) {
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
                        } else {
                            // If parentName is provided, add to the parent
                            const parentColorObj = colorObj.properties.find(
                                (prop): prop is ObjectProperty =>
                                    prop.type === 'ObjectProperty' &&
                                    'key' in prop &&
                                    prop.key.type === 'Identifier' &&
                                    prop.key.name === parentName,
                            );

                            if (
                                parentColorObj &&
                                parentColorObj.value.type === 'ObjectExpression'
                            ) {
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
                    }
                },
            });

            const output = generate(
                updateAst,
                {
                    retainLines: true,
                    compact: false,
                },
                configContent,
            );
            fs.writeFileSync(configPath, output.code);

            return { success: true };
        }

        // If have an original key, it means we are updating an existing color
        const keyParts = originalName.split('-');

        const parentKey = keyParts[0];
        const keyName = keyParts[1];

        if (!parentKey || !keyName) {
            return { success: false, error: 'Invalid color key format: ' + originalName };
        }
        const newCssVarName = newName !== keyName ? `${parentKey}-${newName}` : originalName;

        // As we moving toward to Tailwind 4.0, we should use variable instead of direct color
        // So we need to update the CSS file and the config file
        // If the color is not a variable, we need to add it to the CSS file and the config file
        // If the color is a variable, we need to update the CSS file and the config file

        const lightVarRegex = new RegExp(
            `(:root[^{]*{[^}]*)(--${originalName}\\s*:\\s*[^;]*)(;|})`,
            's',
        );
        let updatedCssContent;

        const isVar = lightVarRegex.test(cssContent);

        if (isVar) {
            // Update the CSS file
            if (newName !== keyName) {
                // Keep the old one for backwards compatibility?
                updatedCssContent = cssContent.replace(
                    lightVarRegex,
                    `$1--${originalName}: ${newColor};--${newCssVarName}: ${newColor}$3`,
                );
            } else {
                updatedCssContent = cssContent.replace(
                    lightVarRegex,
                    `$1--${originalName}: ${newColor}$3`,
                );
            }

            if (updatedCssContent === cssContent) {
                console.log(`Warning: CSS variable --${originalName} not found in CSS file`);
            }
        } else {
            // Add the color to the CSS file
            const cssVarAddition = `\n    --${newCssVarName}: ${newColor};`;

            updatedCssContent = cssContent.replace(
                /(@layer\s*base\s*{\s*:root\s*{[^}]*)(})/,
                `$1${cssVarAddition}$2`,
            );
        }

        fs.writeFileSync(cssPath, updatedCssContent);

        // Update the config file
        const updateAst = parse(configContent, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let keyUpdated = false;
        let valueUpdated = false;

        traverse(updateAst, {
            ObjectProperty(path) {
                if (
                    path.parent.type === 'ObjectExpression' &&
                    path.node.key.type === 'Identifier' &&
                    path.node.key.name === 'colors' &&
                    path.node.value.type === 'ObjectExpression'
                ) {
                    const colorObj = path.node.value;
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
                                        const valueStr = nestedProp.value.value;

                                        const hslRegex = /^hsl(?:a)?\(var\((--[^)]+)\)\)$/;
                                        const varRegex = /^var\((--[^)]+)\)$/;

                                        let updatedValue = valueStr;
                                        const hslMatch = valueStr.match(hslRegex);
                                        const varMatch = valueStr.match(varRegex);

                                        // If value is not already using var() syntax, update it
                                        if (!varMatch && !hslMatch) {
                                            updatedValue = `var(--${newCssVarName})`;
                                        } else if (hslMatch) {
                                            updatedValue = `var(${hslMatch[1]})`;
                                        }

                                        if (newName !== keyName) {
                                            updatedValue = `var(--${newCssVarName})`;
                                        }

                                        nestedProp.value.value = updatedValue;
                                        valueUpdated = true;

                                        console.log(`Updated value to: ${nestedProp.value.value}`);
                                    }
                                }
                            });
                        }
                    });
                }
            },
        });

        if (keyUpdated || valueUpdated) {
            const output = generate(
                updateAst,
                {
                    retainLines: true,
                    compact: false,
                },
                configContent,
            );
            fs.writeFileSync(configPath, output.code);
        } else {
            console.log(`Warning: Could not update key: ${keyName} in ${parentKey}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating Tailwind config:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
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
                cssContent: extractCssConfig(cssContent || ''),
            };
        }

        return {
            configPath,
            configContent: extractColorsFromTailwindConfig(configContent),
            cssPath,
            cssContent: extractCssConfig(cssContent || ''),
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

                        // Convert HSL values to hex if contain hsl or hsla;
                        if (value.includes('hsl') || value.match(/\d+\s+\d+%\s+\d+%/)) {
                            try {
                                // Extract HSL values using more robust regex
                                let h = 0,
                                    s = 0,
                                    l = 0,
                                    a = 1;

                                if (value.includes('hsl')) {
                                    // Handle hsl() and hsla() formats
                                    const hslMatch = value.match(
                                        /hsl\w*\(\s*([^,]+)[,\s]+([^,]+)[,\s]+([^,)]+)/,
                                    );
                                    if (hslMatch) {
                                        h = parseFloat(hslMatch[1].replace('deg', ''));
                                        s = parseFloat(hslMatch[2].replace('%', ''));
                                        l = parseFloat(hslMatch[3].replace('%', ''));
                                        a = parseFloat(hslMatch[4].replace('%', ''));
                                    }
                                } else {
                                    // Handle space-separated format
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
        return '{}';
    }
}

function extractColorsFromTailwindConfig(fileContent: string) {
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

function extractObject(node: any): any {
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

    return {
        configPath,
        cssPath,
    };
}

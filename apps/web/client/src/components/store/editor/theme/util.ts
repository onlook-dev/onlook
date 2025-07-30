import { DEFAULT_COLOR_NAME } from '@onlook/constants';
import { SystemTheme } from '@onlook/models/assets';
import { generate, getAstFromContent, parse, traverse, type t as T } from '@onlook/parser';
import { parseHslValue } from '@onlook/utility';
import type { Root, Rule } from 'postcss';
import postcss from 'postcss';

export function addTailwindNestedColor(
    colorObj: T.ObjectExpression,
    parentName: string,
    newName: string,
    newCssVarName: string,
) {
    const parentColorObj = colorObj.properties.find((prop): prop is T.ObjectProperty =>
        isValidTailwindConfigProperty(prop, parentName),
    );

    if (parentColorObj) {
        if (parentColorObj.value.type === 'StringLiteral') {
            const oldValue = parentColorObj.value.value;
            parentColorObj.value = {
                type: 'ObjectExpression',
                properties: [
                    {
                        type: 'ObjectProperty',
                        key: {
                            type: 'Identifier',
                            name: DEFAULT_COLOR_NAME,
                        },
                        value: {
                            type: 'StringLiteral',
                            value: oldValue,
                        },
                        computed: false,
                        shorthand: false,
                    },
                    {
                        type: 'ObjectProperty',
                        key: {
                            type: 'Identifier',
                            name: newName,
                        },
                        value: {
                            type: 'StringLiteral',
                            value: `var(--${newCssVarName})`,
                        },
                        computed: false,
                        shorthand: false,
                    },
                ],
            };
        } else if (parentColorObj.value.type === 'ObjectExpression') {
            parentColorObj.value.properties.push({
                type: 'ObjectProperty',
                key: {
                    type: 'Identifier',
                    name: newName,
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

// Helper to process CSS with PostCSS
async function processCss(css: string, plugins: any[]) {
    const result = await postcss(plugins).process(css, {
        from: undefined, // Prevents source map generation
    });
    return result.css;
}

export async function addTailwindCssVariable(
    cssContent: string,
    varName: string,
    color: string,
): Promise<string> {
    return processCss(cssContent, [
        {
            postcssPlugin: 'add-css-var',
            Once(root: Root) {
                root.walkRules(':root', (rule: Rule) => {
                    rule.append({ prop: `--${varName}`, value: color });
                });

                root.walkRules('.dark', (rule: Rule) => {
                    rule.append({ prop: `--${varName}`, value: color });
                });
            },
        },
    ]);
}

// Update existing CSS variable
export async function updateTailwindCssVariable(
    cssContent: string,
    originalName: string,
    newVarName?: string,
    newColor?: string,
    theme?: SystemTheme,
): Promise<string> {
    return processCss(cssContent, [
        {
            postcssPlugin: 'update-css-var',
            Once(root: Root) {
                let rootValue: string | undefined;
                let darkValue: string | undefined;
                let hasRootVar = false;
                let hasDarkVar = false;

                root.walkRules(':root', (rule) => {
                    rule.walkDecls(`--${originalName}`, (decl) => {
                        rootValue = decl.value;
                        hasRootVar = true;
                    });
                });

                root.walkRules('.dark', (rule) => {
                    rule.walkDecls(`--${originalName}`, (decl) => {
                        darkValue = decl.value;
                        hasDarkVar = true;
                    });
                });

                // Create new variables if they don't exist and we have both newVarName and newColor
                if (newVarName && newColor) {
                    if (!hasRootVar) {
                        root.walkRules(':root', (rule) => {
                            rule.append({ prop: `--${newVarName}`, value: newColor });
                        });
                    }
                    if (!hasDarkVar) {
                        root.walkRules('.dark', (rule) => {
                            rule.append({ prop: `--${newVarName}`, value: newColor });
                        });
                    }
                }

                root.walkRules(/^(:root|\.dark)$/, (rule) => {
                    const isDarkTheme = rule.selector === '.dark';
                    const shouldUpdateValue =
                        newColor &&
                        (!theme ||
                            (isDarkTheme
                                ? theme === SystemTheme.DARK
                                : theme === SystemTheme.LIGHT));

                    rule.walkDecls((decl) => {
                        if (decl.prop === `--${originalName}`) {
                            const otherThemeValue = isDarkTheme ? rootValue : darkValue;
                            const isOtherThemeHex = otherThemeValue?.startsWith('#');
                            const shouldConvertToHex = newColor?.startsWith('#') ?? isOtherThemeHex;

                            if (newVarName && newVarName !== originalName) {
                                // Handle variable rename
                                let valueToUse = shouldUpdateValue ? newColor : decl.value;

                                if (shouldConvertToHex && !valueToUse.startsWith('#')) {
                                    try {
                                        const color = parseHslValue(valueToUse);
                                        if (color) {
                                            valueToUse = color.toHex();
                                        }
                                    } catch (err) {
                                        console.error('Failed to convert to hex:', err);
                                    }
                                }

                                rule.append({
                                    prop: `--${newVarName}`,
                                    value: valueToUse,
                                });
                                decl.remove();
                            } else if (shouldUpdateValue || shouldConvertToHex) {
                                // Handle value update or format conversion
                                let newValue = shouldUpdateValue ? newColor : decl.value;

                                if (shouldConvertToHex && !newValue.startsWith('#')) {
                                    try {
                                        const color = parseHslValue(newValue);
                                        if (color) {
                                            newValue = color.toHex();
                                        }
                                    } catch (err) {
                                        console.error('Failed to convert to hex:', err);
                                    }
                                }

                                decl.value = newValue;
                            }
                        }

                        // Handle variable usages in other declarations
                        if (decl.value.includes(`var(--${originalName})`)) {
                            if (newVarName && newVarName !== originalName) {
                                decl.value = decl.value.replace(
                                    new RegExp(`var\\(--${originalName}\\)`, 'g'),
                                    `var(--${newVarName})`,
                                );
                            }
                        }

                        // Handle nested variables rename if existed
                        if (
                            newVarName &&
                            newVarName !== originalName &&
                            decl.prop.includes(originalName)
                        ) {
                            const nestedVarRegex = new RegExp(`^--${originalName}-`);
                            if (nestedVarRegex.test(decl.prop)) {
                                const newProp = decl.prop.replace(originalName, newVarName);
                                rule.append({ prop: newProp, value: decl.value });
                                decl.remove();
                            }
                        }
                    });
                });

                // update Tailwind classes that use the variable
                root.walkAtRules('layer', (layerRule) => {
                    layerRule.walkRules((rule) => {
                        rule.nodes?.forEach((node) => {
                            // Check if this is an @apply at-rule
                            if (node.type === 'atrule' && 'name' in node && node.name === 'apply') {
                                const value = 'params' in node ? node.params : '';

                                const utilityPattern = new RegExp(`-${originalName}\\b`, 'g');
                                const hasMatch = utilityPattern.test(value);

                                if (hasMatch) {
                                    const newValue = value.replace(utilityPattern, (match) => {
                                        const replaced = match.replace(
                                            originalName,
                                            newVarName ?? originalName,
                                        );
                                        return replaced;
                                    });
                                    if ('params' in node) {
                                        node.params = newValue;
                                    }
                                }
                            }
                        });
                    });
                });
            },
        },
    ]);
}

// Extract CSS variables from stylesheet
export function extractTailwindCssVariables(content: string) {
    const configs: {
        root: Record<string, { value: string; line: number | undefined }>;
        dark: Record<string, { value: string; line: number | undefined }>;
    } = {
        root: {},
        dark: {},
    };

    const result = postcss.parse(content);

    result.walkRules(':root', (rule) => {
        rule.walkDecls(/^--/, (decl) => {
            const varName = decl.prop.slice(2);
            const value = decl.value;

            // Convert HSL to hex if needed
            try {
                const color = parseHslValue(value);
                if (color) {
                    configs.root[varName] = {
                        value: color.toHex(),
                        line: decl.source?.start?.line,
                    };
                    return;
                }
            } catch (err) {
                console.error(`Failed to convert HSL value: ${value}`, err);
            }

            configs.root[varName] = {
                value,
                line: decl.source?.start?.line,
            };
        });
    });

    result.walkRules('.dark', (rule) => {
        rule.walkDecls(/^--/, (decl) => {
            const varName = decl.prop.slice(2);
            const value = decl.value;

            try {
                const color = parseHslValue(value);
                if (color) {
                    configs.dark[varName] = {
                        value: color.toHex(),
                        line: decl.source?.start?.line,
                    };
                    return;
                }
            } catch (err) {
                console.error(`Failed to convert HSL value: ${value}`, err);
            }

            configs.dark[varName] = {
                value,
                line: decl.source?.start?.line,
            };
        });
    });

    return configs;
}

export function extractColorsFromTailwindConfig(fileContent: string): Record<string, any> {
    try {
        const ast = getAstFromContent(fileContent);
        if (!ast) {
            throw new Error(`Failed to parse file in extractColorsFromTailwindConfig`);
        }

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

/**
 * Check if the property is a valid tailwind config property
 * @param prop - The property to check
 * @param keyName - The key name to check against (can be a string or a number)
 * @returns True if the property is a valid tailwind config property, false otherwise
 */
export function isValidTailwindConfigProperty(
    prop: T.ObjectProperty | T.ObjectMethod | T.SpreadElement,
    keyName: string,
): boolean {
    return (
        prop.type === 'ObjectProperty' &&
        'key' in prop &&
        (prop.key.type === 'Identifier' || prop.key.type === 'NumericLiteral') &&
        (prop.key.type === 'Identifier'
            ? prop.key.name === keyName
            : String(prop.key.value) === keyName)
    );
}

export function extractObject(node: T.Node): Record<string, any> {
    if (node.type !== 'ObjectExpression') {
        return {};
    }

    const result: Record<string, any> = {};
    node.properties.forEach((prop: any) => {
        if (prop.type === 'ObjectProperty') {
            let key: string;

            if (prop.key.type === 'Identifier') {
                key = prop.key.name;
            } else if (prop.key.type === 'NumericLiteral') {
                key = prop.key.value.toString();
            } else if (prop.key.type === 'StringLiteral') {
                key = prop.key.value;
            } else {
                return;
            }

            if (prop.value.type === 'StringLiteral') {
                result[key] = {
                    value: prop.value.value,
                    line: prop.loc?.start?.line,
                };
            } else if (prop.value.type === 'ObjectExpression') {
                result[key] = extractObject(prop.value);
            }
        }
    });

    return result;
}

export function addTailwindRootColor(
    colorObj: T.ObjectExpression,
    newName: string,
    newCssVarName: string,
) {
    colorObj.properties.push({
        type: 'ObjectProperty',
        key: {
            type: 'Identifier',
            name: newName,
        },
        value: {
            type: 'ObjectExpression',
            properties: [
                {
                    type: 'ObjectProperty',
                    key: {
                        type: 'Identifier',
                        name: DEFAULT_COLOR_NAME,
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
}

export interface TailwindConfigModifier {
    visitor: (path: any) => boolean;
}

export interface ModifyTailwindConfigResult {
    isUpdated: boolean;
    output: string;
}

/**
 * Generic utility to modify Tailwind config files
 * @param configContent - The content of the tailwind config file
 * @param modifier - A visitor function that will modify the AST
 * @returns The modification result with updated code and whether an update was made
 */
export function modifyTailwindConfig(
    configContent: string,
    modifier: TailwindConfigModifier,
): ModifyTailwindConfigResult {
    const updateAst = parse(configContent, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let isUpdated = false;

    traverse(updateAst, {
        ObjectProperty(path) {
            // Call the visitor function, which might return true if it updated anything
            const wasUpdated = modifier.visitor(path);

            // If the visitor returns true, it made an update
            if (wasUpdated) {
                isUpdated = true;
            }
        },
    });

    const output = generate(updateAst, { retainLines: true, compact: false }, configContent).code;
    return { isUpdated, output };
}

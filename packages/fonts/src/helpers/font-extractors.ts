import type { Font } from '@onlook/models';
import { parse, traverse, generate, type t as T, types as t } from '@onlook/parser';
import { removeFontsFromClassName } from './class-utils';

/**
 * Parses source code to extract all font configurations from import statements and variable declarations.
 * Scans for both Google Fonts and local fonts, building a comprehensive list of font metadata
 * including subsets, weights, styles, and CSS variables. Handles Next.js font patterns.
 *
 * @param content - The source code content to parse and extract fonts from
 * @returns Array of Font objects containing extracted font configurations
 */
export const parseFontDeclarations = (content: string): Font[] => {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontImports: Record<string, string> = {};
    const fonts: Font[] = [];

    traverse(ast, {
        // Extract font imports from 'next/font/google' and 'next/font/local'
        ImportDeclaration(path) {
            const source = path.node.source.value;
            if (source === 'next/font/google') {
                path.node.specifiers.forEach((specifier) => {
                    if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                        fontImports[specifier.imported.name] = specifier.imported.name;
                    }
                });
            } else if (source === 'next/font/local') {
                path.node.specifiers.forEach((specifier) => {
                    if (t.isImportDefaultSpecifier(specifier) && t.isIdentifier(specifier.local)) {
                        fontImports[specifier.local.name] = 'localFont';
                    }
                });
            }
        },

        VariableDeclaration(path) {
            const parentNode = path.parent;
            if (!t.isExportNamedDeclaration(parentNode)) {
                return;
            }

            path.node.declarations.forEach((declarator) => {
                if (!t.isIdentifier(declarator.id) || !declarator.init) {
                    return;
                }

                const fontId = declarator.id.name;

                if (t.isCallExpression(declarator.init)) {
                    const callee = declarator.init.callee;

                    let fontType = '';
                    if (t.isIdentifier(callee) && fontImports[callee.name]) {
                        fontType = fontImports[callee.name] ?? '';
                    }

                    const configArg = declarator.init.arguments[0];
                    if (t.isObjectExpression(configArg)) {
                        const fontConfig = buildFontConfiguration(fontId, fontType, configArg);
                        fonts.push(fontConfig);
                    }
                }
            });
        },
    });

    return fonts;
};

/**
 * Converts an AST object expression into a structured Font configuration object.
 * Extracts font properties like subsets, weights, styles, and CSS variables,
 * handling both Google Fonts and local font configurations with different property structures.
 *
 * @param fontId - The font identifier/variable name
 * @param fontType - The type of font ('localFont' for local fonts, font name for Google Fonts)
 * @param configArg - The AST object expression containing font configuration properties
 * @returns Font object with extracted configuration metadata
 */
export function buildFontConfiguration(
    fontId: string,
    fontType: string,
    configArg: T.ObjectExpression,
): Font {
    const fontConfig: Record<string, any> = {
        id: fontId,
        family: fontType === 'localFont' ? fontId : fontType.replace(/_/g, ' '),
        type: fontType === 'localFont' ? 'local' : 'google',
        subsets: [],
        weight: [],
        styles: [],
        variable: '',
    };

    configArg.properties.forEach((prop) => {
        if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) {
            return;
        }

        const propName = prop.key.name;

        if (propName === 'variable' && t.isStringLiteral(prop.value)) {
            fontConfig.variable = prop.value.value;
        }

        if (propName === 'subsets' && t.isArrayExpression(prop.value)) {
            fontConfig.subsets = prop.value.elements
                .filter((element): element is T.StringLiteral => t.isStringLiteral(element))
                .map((element) => element.value);
        }

        if ((propName === 'weight' || propName === 'weights') && t.isArrayExpression(prop.value)) {
            fontConfig.weight = prop.value.elements
                .map((element) => {
                    if (t.isStringLiteral(element)) {
                        return element.value;
                    } else if (t.isNumericLiteral(element)) {
                        return element.value.toString();
                    }
                    return null;
                })
                .filter((weight): weight is string => weight !== null && !isNaN(Number(weight)));
        }

        if ((propName === 'style' || propName === 'styles') && t.isArrayExpression(prop.value)) {
            fontConfig.styles = prop.value.elements
                .filter((element): element is T.StringLiteral => t.isStringLiteral(element))
                .map((element) => element.value);
        }

        // Handle local font src property
        if (propName === 'src' && t.isArrayExpression(prop.value) && fontType === 'localFont') {
            const srcConfigs = prop.value.elements
                .filter((element): element is T.ObjectExpression => t.isObjectExpression(element))
                .map((element) => {
                    const srcConfig: Record<string, string> = {};
                    element.properties.forEach((srcProp) => {
                        if (t.isObjectProperty(srcProp) && t.isIdentifier(srcProp.key)) {
                            const srcPropName = srcProp.key.name;
                            if (t.isStringLiteral(srcProp.value)) {
                                srcConfig[srcPropName] = srcProp.value.value;
                            }
                        }
                    });
                    return srcConfig;
                });

            fontConfig.weight = [...new Set(srcConfigs.map((config) => config.weight))];
            fontConfig.styles = [...new Set(srcConfigs.map((config) => config.style))];
        }
    });

    return fontConfig as Font;
}

/**
 * Migrates font declarations from a layout file to a dedicated font configuration file.
 * Extracts all font imports and variable declarations, removes them from the layout,
 * and cleans up className references. Returns both the cleaned layout content and
 * extracted font configurations for use in a centralized font config file.
 *
 * @param content - The layout file content containing font declarations to migrate
 * @returns Object containing cleaned layout content and array of extracted font configurations
 */
export function migrateFontsFromLayout(content: string): {
    layoutContent: string;
    fonts: Font[];
} {
    try {
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontImports: Record<string, string> = {};
        const fontVariables: string[] = [];
        const fonts: Font[] = [];

        traverse(ast, {
            ImportDeclaration(path) {
                if (!path.node?.source?.value) {
                    return;
                }

                const source = path.node.source.value;
                if (source === 'next/font/google') {
                    if (!path.node.specifiers) {
                        return;
                    }

                    path.node.specifiers.forEach((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            fontImports[specifier.imported.name] = specifier.imported.name;
                            path.remove();
                        }
                    });
                } else if (source === 'next/font/local') {
                    if (!path.node.specifiers) {
                        return;
                    }

                    path.node.specifiers.forEach((specifier) => {
                        if (
                            t.isImportDefaultSpecifier(specifier) &&
                            t.isIdentifier(specifier.local)
                        ) {
                            fontImports[specifier.local.name] = 'localFont';
                            path.remove();
                        }
                    });
                }
            },

            VariableDeclaration(path) {
                if (!path.node.declarations) {
                    return;
                }

                path.node.declarations.forEach((declaration: T.VariableDeclarator) => {
                    if (!t.isIdentifier(declaration.id) || !declaration.init) {
                        return;
                    }

                    const fontId = declaration.id.name;

                    if (t.isCallExpression(declaration.init)) {
                        const callee = declaration.init.callee;

                        let fontType = '';
                        if (t.isIdentifier(callee) && fontImports[callee.name]) {
                            fontType = fontImports[callee.name] ?? '';
                        }

                        const configArg = declaration.init.arguments[0];
                        fontVariables.push(fontId);

                        if (t.isObjectExpression(configArg)) {
                            const fontConfig = buildFontConfiguration(fontId, fontType, configArg);

                            if (!fontConfig.variable) {
                                fontConfig.variable = `--font-${fontId}`;
                            }

                            fonts.push(fontConfig);
                        }
                        path.remove();
                    }
                });
            },
            JSXOpeningElement(path) {
                if (!path.node || !t.isJSXIdentifier(path.node.name) || !path.node.attributes) {
                    return;
                }

                if (!fonts.length) {
                    return;
                }

                path.node.attributes.forEach((attr) => {
                    if (
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'className'
                    ) {
                        try {
                            removeFontsFromClassName(attr, { fontIds: fontVariables });
                        } catch (classNameError) {
                            console.error('Error processing className:', classNameError);
                        }
                    }
                });
            },
        });

        return { layoutContent: generate(ast, {}, content).code, fonts };
    } catch (error) {
        console.error('Error extracting font imports:', error);
        return { layoutContent: content, fonts: [] };
    }
}

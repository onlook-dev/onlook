import * as t from '@babel/types';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { readFile } from '../../code/files';
import fs from 'fs';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';
import * as pathModule from 'path';
import { detectRouterType } from '../../pages';
import generate from '@babel/generator';
import { removeFontsFromClassName } from './utils';
import { addFonts } from './font';

export async function scanFonts(projectRoot: string): Promise<Font[]> {
    try {
        const existedFonts = await scanExistingFonts(projectRoot);
        if (existedFonts && existedFonts.length > 0) {
            await addFonts(projectRoot, existedFonts);
        }

        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        const content = await readFile(fontPath);

        if (!content) {
            return [];
        }

        const fonts: Font[] = [];

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontImports: Record<string, string> = {};

        traverse(ast, {
            // Extract font imports from 'next/font/google'
            ImportDeclaration(path) {
                const source = path.node.source.value;
                if (source === 'next/font/google') {
                    path.node.specifiers.forEach((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            // Map the imported name to itself (for matching constructors later)
                            fontImports[specifier.imported.name] = specifier.imported.name;
                        }
                    });
                }
            },

            // Find font variable declarations
            VariableDeclaration(path) {
                // Only process export declarations
                const parentNode = path.parent;
                if (!t.isExportNamedDeclaration(parentNode)) {
                    return;
                }

                // Process each variable declarator
                path.node.declarations.forEach((declarator) => {
                    if (!t.isIdentifier(declarator.id) || !declarator.init) {
                        return;
                    }

                    const fontId = declarator.id.name;

                    // Check if it's a font constructor call
                    if (t.isCallExpression(declarator.init)) {
                        const callee = declarator.init.callee;

                        // Get the font type (constructor name)
                        let fontType = '';
                        if (t.isIdentifier(callee) && fontImports[callee.name]) {
                            fontType = fontImports[callee.name];
                        }

                        // Get the configuration object
                        const configArg = declarator.init.arguments[0];
                        if (t.isObjectExpression(configArg)) {
                            // Extract configuration properties
                            const fontConfig: Record<string, any> = {
                                id: fontId,
                                family: fontType.replace(/_/g, ' '),
                                type: 'google',
                                subsets: [],
                                weight: [],
                                styles: [],
                                variable: '',
                            };

                            // Process each property in the config object
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
                                        .filter((element): element is t.StringLiteral =>
                                            t.isStringLiteral(element),
                                        )
                                        .map((element) => element.value);
                                }

                                if (
                                    (propName === 'weight' || propName === 'weights') &&
                                    t.isArrayExpression(prop.value)
                                ) {
                                    fontConfig.weight = prop.value.elements
                                        .map((element) => {
                                            if (t.isStringLiteral(element)) {
                                                return element.value;
                                            } else if (t.isNumericLiteral(element)) {
                                                return element.value.toString();
                                            }
                                            return null;
                                        })
                                        .filter(
                                            (weight): weight is string =>
                                                weight !== null && !isNaN(Number(weight)),
                                        );
                                }

                                if (
                                    (propName === 'style' || propName === 'styles') &&
                                    t.isArrayExpression(prop.value)
                                ) {
                                    fontConfig.styles = prop.value.elements
                                        .filter((element): element is t.StringLiteral =>
                                            t.isStringLiteral(element),
                                        )
                                        .map((element) => element.value);
                                }
                            });

                            fonts.push(fontConfig as Font);
                        }
                    }
                });
            },
        });

        return fonts;
    } catch (error) {
        console.error('Error scanning fonts:', error);
        return [];
    }
}

export async function scanExistingFonts(projectRoot: string): Promise<Font[] | undefined> {
    const routerConfig = await detectRouterType(projectRoot);

    if (!routerConfig) {
        return [];
    }

    if (routerConfig.type === 'app') {
        const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
        const content = await readFile(layoutPath);
        if (!content) {
            return [];
        }

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontImports: Record<string, string> = {};
        const fontVariables: string[] = [];
        const fonts: Font[] = [];
        let updatedAst = false;

        traverse(ast, {
            ImportDeclaration(path) {
                const source = path.node.source.value;
                if (source === 'next/font/google') {
                    path.node.specifiers.forEach((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            fontImports[specifier.imported.name] = specifier.imported.name;
                            path.remove();
                        }
                    });
                }
            },

            VariableDeclaration(path) {
                path.node.declarations.forEach((declarator) => {
                    if (!t.isIdentifier(declarator.id) || !declarator.init) {
                        return;
                    }
                    // Check if it's a font constructor call

                    if (t.isCallExpression(declarator.init)) {
                        const callee = declarator.init.callee;
                        if (t.isIdentifier(callee) && fontImports[callee.name]) {
                            const fontType = fontImports[callee.name];
                            const configArg = declarator.init.arguments[0];
                            fontVariables.push(declarator.id.name);

                            if (t.isObjectExpression(configArg)) {
                                const fontConfig: Record<string, any> = {
                                    id: declarator.id.name,
                                    family: fontType.replace(/_/g, ' '),
                                    type: 'google',
                                    subsets: [],
                                    weight: [],
                                    styles: [],
                                    variable: `--font-${declarator.id.name}`,
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
                                            .filter((element): element is t.StringLiteral =>
                                                t.isStringLiteral(element),
                                            )
                                            .map((element) => element.value);
                                    }

                                    if (propName === 'weight' && t.isArrayExpression(prop.value)) {
                                        fontConfig.weight = prop.value.elements
                                            .map((element) => {
                                                if (t.isStringLiteral(element)) {
                                                    return element.value;
                                                } else if (t.isNumericLiteral(element)) {
                                                    return element.value.toString();
                                                }
                                                return null;
                                            })
                                            .filter(
                                                (weight): weight is string =>
                                                    weight !== null && !isNaN(Number(weight)),
                                            );
                                    }

                                    if (propName === 'style' && t.isArrayExpression(prop.value)) {
                                        fontConfig.styles = prop.value.elements
                                            .filter((element): element is t.StringLiteral =>
                                                t.isStringLiteral(element),
                                            )
                                            .map((element) => element.value);
                                    }
                                });

                                fonts.push(fontConfig as Font);
                            }
                            updatedAst = true;
                            path.remove();
                        }
                    }
                });
            },

            JSXOpeningElement(path) {
                if (!t.isJSXIdentifier(path.node.name)) {
                    return;
                }

                // Process all className attributes
                path.node.attributes.forEach((attr) => {
                    if (
                        t.isJSXAttribute(attr) &&
                        t.isJSXIdentifier(attr.name) &&
                        attr.name.name === 'className'
                    ) {
                        // Remove font variable references from className
                        if (removeFontsFromClassName(attr, { fontIds: fontVariables })) {
                            updatedAst = true;
                        }
                    }
                });
            },
        });

        if (updatedAst) {
            const { code } = generate(ast);
            await fs.writeFileSync(layoutPath, code);
        }
        return fonts;
    }
}

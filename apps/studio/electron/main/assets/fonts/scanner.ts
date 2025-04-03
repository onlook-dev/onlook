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

function extractFontConfig(fontId: string, fontType: string, configArg: t.ObjectExpression): Font {
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
                .filter((element): element is t.StringLiteral => t.isStringLiteral(element))
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
                .filter((element): element is t.StringLiteral => t.isStringLiteral(element))
                .map((element) => element.value);
        }

        // Handle local font src property
        if (propName === 'src' && t.isArrayExpression(prop.value) && fontType === 'localFont') {
            const srcConfigs = prop.value.elements
                .filter((element): element is t.ObjectExpression => t.isObjectExpression(element))
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

export async function scanFonts(projectRoot: string): Promise<Font[]> {
    try {
        let existedFonts: Font[] | undefined = [];
        try {
            existedFonts = await scanExistingFonts(projectRoot);
            if (existedFonts && existedFonts.length > 0) {
                await addFonts(projectRoot, existedFonts);
            }
        } catch (existingFontsError) {
            console.error('Error scanning existing fonts:', existingFontsError);
        }

        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);

        if (!fs.existsSync(fontPath)) {
            console.log('Font file does not exist:', fontPath);
            return existedFonts || [];
        }

        const content = await readFile(fontPath);

        if (!content) {
            return existedFonts || [];
        }

        const fonts: Font[] = [];

        try {
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            const fontImports: Record<string, string> = {};

            traverse(ast, {
                // Extract font imports from 'next/font/google' and 'next/font/local'
                ImportDeclaration(path) {
                    const source = path.node.source.value;
                    if (source === 'next/font/google') {
                        path.node.specifiers.forEach((specifier) => {
                            if (
                                t.isImportSpecifier(specifier) &&
                                t.isIdentifier(specifier.imported)
                            ) {
                                fontImports[specifier.imported.name] = specifier.imported.name;
                            }
                        });
                    } else if (source === 'next/font/local') {
                        path.node.specifiers.forEach((specifier) => {
                            if (
                                t.isImportDefaultSpecifier(specifier) &&
                                t.isIdentifier(specifier.local)
                            ) {
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
                                fontType = fontImports[callee.name];
                            }

                            const configArg = declarator.init.arguments[0];
                            if (t.isObjectExpression(configArg)) {
                                const fontConfig = extractFontConfig(fontId, fontType, configArg);
                                fonts.push(fontConfig);
                            }
                        }
                    });
                },
            });

            return fonts;
        } catch (parseError) {
            console.error('Error parsing font file:', parseError);
            return existedFonts || [];
        }
    } catch (error) {
        console.error('Error scanning fonts:', error);
        return [];
    }
}

export async function scanExistingFonts(projectRoot: string): Promise<Font[] | undefined> {
    try {
        const routerConfig = await detectRouterType(projectRoot);
        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return [];
        }

        // Determine the layout file path based on router type
        let layoutPath: string;
        if (routerConfig.type === 'app') {
            layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
        } else {
            layoutPath = pathModule.join(routerConfig.basePath, '_app.tsx');
        }

        if (!fs.existsSync(layoutPath)) {
            console.log(`Layout file does not exist: ${layoutPath}`);
            return [];
        }

        const content = await readFile(layoutPath);
        if (!content) {
            console.log(`Layout file is empty: ${layoutPath}`);
            return [];
        }

        try {
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            const fontImports: Record<string, string> = {};
            const fontVariables: string[] = [];
            const fonts: Font[] = [];
            let updatedAst = false;

            try {
                traverse(ast, {
                    ImportDeclaration(path) {
                        if (!path.node || !path.node.source || !path.node.source.value) {
                            return;
                        }

                        const source = path.node.source.value;
                        if (source === 'next/font/google') {
                            if (!path.node.specifiers) {
                                return;
                            }

                            path.node.specifiers.forEach((specifier) => {
                                if (
                                    t.isImportSpecifier(specifier) &&
                                    t.isIdentifier(specifier.imported)
                                ) {
                                    fontImports[specifier.imported.name] = specifier.imported.name;
                                    try {
                                        path.remove();
                                    } catch (removeError) {
                                        console.error('Error removing font import:', removeError);
                                    }
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
                                    try {
                                        path.remove();
                                    } catch (removeError) {
                                        console.error('Error removing font import:', removeError);
                                    }
                                }
                            });
                        }
                    },

                    VariableDeclaration(path) {
                        if (!path.node || !path.node.declarations) {
                            return;
                        }

                        path.node.declarations.forEach((declarator) => {
                            if (!t.isIdentifier(declarator.id) || !declarator.init) {
                                return;
                            }

                            if (t.isCallExpression(declarator.init)) {
                                const callee = declarator.init.callee;
                                if (t.isIdentifier(callee) && fontImports[callee.name]) {
                                    const fontType = fontImports[callee.name];
                                    const configArg = declarator.init.arguments[0];
                                    fontVariables.push(declarator.id.name);

                                    if (t.isObjectExpression(configArg)) {
                                        const fontConfig = extractFontConfig(
                                            declarator.id.name,
                                            fontType,
                                            configArg,
                                        );

                                        if (!fontConfig.variable) {
                                            fontConfig.variable = `--font-${declarator.id.name}`;
                                        }

                                        fonts.push(fontConfig);
                                    }
                                    updatedAst = true;
                                    try {
                                        path.remove();
                                    } catch (removeError) {
                                        console.error('Error removing font variable:', removeError);
                                    }
                                }
                            }
                        });
                    },

                    JSXOpeningElement(path) {
                        if (
                            !path.node ||
                            !t.isJSXIdentifier(path.node.name) ||
                            !path.node.attributes
                        ) {
                            return;
                        }

                        path.node.attributes.forEach((attr) => {
                            if (
                                t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === 'className'
                            ) {
                                try {
                                    if (
                                        removeFontsFromClassName(attr, { fontIds: fontVariables })
                                    ) {
                                        updatedAst = true;
                                    }
                                } catch (classNameError) {
                                    console.error('Error processing className:', classNameError);
                                }
                            }
                        });
                    },
                });
            } catch (traverseError) {
                console.error('Error during AST traversal:', traverseError);
                return [];
            }

            if (updatedAst) {
                try {
                    const { code } = generate(ast);
                    fs.writeFileSync(layoutPath, code);
                } catch (generateError) {
                    console.error('Error generating code from AST:', generateError);
                }
            }
            return fonts;
        } catch (parseError) {
            console.error(`Error parsing layout file ${layoutPath}:`, parseError);
            return [];
        }
    } catch (error) {
        console.error('Error scanning existing fonts:', error);
        return [];
    }
}

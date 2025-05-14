import { parse, traverse, generate, type t as T, types as t, type NodePath } from '@onlook/parser';
import type { Font } from '@onlook/models';
import { createFontFamilyProperty, isPropertyWithName, isThemeProperty } from './helper';

export const extractFontImport = (content: string): Font[] => {
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
                        const fontConfig = extractFontConfig(fontId, fontType, configArg);
                        fonts.push(fontConfig);
                    }
                }
            });
        },
    });

    return fonts;
};

export function extractFontConfig(
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

export function extractExistingFontImport(content: string): { code?: string; fonts: Font[] } {
    try {
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
                const parentNode = path.parent;
                if (!t.isExportNamedDeclaration(parentNode)) {
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
                        if (t.isObjectExpression(configArg)) {
                            const fontConfig = extractFontConfig(fontId, fontType, configArg);
                            fonts.push(fontConfig);
                        }
                    }
                });
            },
        });

        if (updatedAst) {
            return {
                code: generate(ast, {}, content).code,
                fonts,
            };
        }

        return { fonts };
    } catch (error) {
        console.error('Error extracting font imports:', error);
        return { fonts: [] };
    }
}

export function validateFontImportAndExport(
    content: string,
    importName: string,
    fontName: string,
): { hasGoogleFontImport: boolean; hasImportName: boolean; hasFontExport: boolean } {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let hasGoogleFontImport = false;
    let hasImportName = false;
    let hasFontExport = false;

    traverse(ast, {
        ImportDeclaration(path: NodePath<T.ImportDeclaration>) {
            if (path.node.source.value === 'next/font/google') {
                hasGoogleFontImport = true;
                path.node.specifiers.forEach((specifier) => {
                    if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                        if (specifier.imported.name === importName) {
                            hasImportName = true;
                        }
                    }
                });
            }
        },

        ExportNamedDeclaration(path: NodePath<T.ExportNamedDeclaration>) {
            if (t.isVariableDeclaration(path.node.declaration)) {
                path.node.declaration.declarations.forEach((declaration) => {
                    if (t.isIdentifier(declaration.id) && declaration.id.name === fontName) {
                        hasFontExport = true;
                    }
                });
            }
        },
    });

    return { hasGoogleFontImport, hasImportName, hasFontExport };
}

export function removeFontFromConfigAST(font: Font, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    const fontIdToRemove = font.id;
    const importToRemove = font.family.replace(/\s+/g, '_');
    let removedFont = false;
    const fontFilesToDelete: string[] = [];
    // Track if any localFont declarations remain after removal
    let hasRemainingLocalFonts = false;

    traverse(ast, {
        ImportDeclaration(path) {
            if (path.node.source.value === 'next/font/google') {
                const importSpecifiers = path.node.specifiers.filter((specifier) => {
                    if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                        return specifier.imported.name !== importToRemove;
                    }
                    return true;
                });
                if (importSpecifiers.length === 0) {
                    path.remove();
                } else if (importSpecifiers.length !== path.node.specifiers.length) {
                    path.node.specifiers = importSpecifiers;
                }
            }
        },

        ExportNamedDeclaration(path) {
            if (t.isVariableDeclaration(path.node.declaration)) {
                const declarations = path.node.declaration.declarations;

                for (let i = 0; i < declarations.length; i++) {
                    const declaration = declarations[i];

                    // Check if this is a localFont declaration (not the one being removed)
                    if (
                        declaration &&
                        t.isIdentifier(declaration.id) &&
                        declaration.id.name !== fontIdToRemove &&
                        t.isCallExpression(declaration.init) &&
                        t.isIdentifier(declaration.init.callee) &&
                        declaration.init.callee.name === 'localFont'
                    ) {
                        hasRemainingLocalFonts = true;
                    }

                    if (
                        declaration &&
                        t.isIdentifier(declaration.id) &&
                        declaration.id.name === fontIdToRemove
                    ) {
                        // Extract font file paths from the local font configuration
                        if (
                            t.isCallExpression(declaration.init) &&
                            t.isIdentifier(declaration.init.callee) &&
                            declaration.init.callee.name === 'localFont' &&
                            declaration.init.arguments.length > 0 &&
                            t.isObjectExpression(declaration.init.arguments[0])
                        ) {
                            const fontConfig = declaration.init.arguments[0];
                            const srcProp = fontConfig.properties.find(
                                (prop) =>
                                    t.isObjectProperty(prop) &&
                                    t.isIdentifier(prop.key) &&
                                    prop.key.name === 'src',
                            );

                            if (
                                srcProp &&
                                t.isObjectProperty(srcProp) &&
                                t.isArrayExpression(srcProp.value)
                            ) {
                                // Loop through the src array to find font file paths
                                srcProp.value.elements.forEach((element) => {
                                    if (t.isObjectExpression(element)) {
                                        const pathProp = element.properties.find(
                                            (prop) =>
                                                t.isObjectProperty(prop) &&
                                                t.isIdentifier(prop.key) &&
                                                prop.key.name === 'path',
                                        );

                                        if (
                                            pathProp &&
                                            t.isObjectProperty(pathProp) &&
                                            t.isStringLiteral(pathProp.value)
                                        ) {
                                            // Get the path value
                                            let fontFilePath = pathProp.value.value;
                                            if (fontFilePath.startsWith('../')) {
                                                fontFilePath = fontFilePath.substring(3); // Remove '../' prefix
                                            }
                                            fontFilesToDelete.push(fontFilePath);
                                        }
                                    }
                                });
                            }
                        }

                        if (declarations.length === 1) {
                            path.remove();
                        } else {
                            declarations.splice(i, 1);
                        }
                        removedFont = true;
                        break;
                    }
                }
            }
        },
    });

    return { removedFont, hasRemainingLocalFonts, fontFilesToDelete, ast };
}

export function removeFontFromThemeAST(fontId: string, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
        ObjectProperty(path) {
            if (isThemeProperty(path)) {
                const value = path.node.value;
                if (t.isObjectExpression(value)) {
                    const fontFamilyProperty = value.properties.find((prop) =>
                        isPropertyWithName(prop, 'fontFamily'),
                    );

                    if (fontFamilyProperty && t.isObjectProperty(fontFamilyProperty)) {
                        const fontFamilyValue = fontFamilyProperty.value;
                        if (t.isObjectExpression(fontFamilyValue)) {
                            const fontFamilyProps = fontFamilyValue.properties.filter((prop) => {
                                if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                                    return prop.key.name !== fontId;
                                }
                                return true;
                            });

                            if (fontFamilyProps.length !== fontFamilyValue.properties.length) {
                                fontFamilyValue.properties = fontFamilyProps;
                            }
                        }
                    }
                }
            }
        },
    });

    return generate(ast, {}, content).code;
}

export function addFontToConfigAST(font: Font, content: string) {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
        ObjectProperty(path) {
            if (isThemeProperty(path)) {
                const value = path.node.value;
                if (t.isObjectExpression(value)) {
                    const fontFamilyProperty = value.properties.find((prop) =>
                        isPropertyWithName(prop, 'fontFamily'),
                    );

                    if (fontFamilyProperty && t.isObjectProperty(fontFamilyProperty)) {
                        const fontFamilyValue = fontFamilyProperty.value;
                        if (t.isObjectExpression(fontFamilyValue)) {
                            const fontFamilyProps = fontFamilyValue.properties;
                            const newFontFamilyProperty = createFontFamilyProperty(font);
                            fontFamilyProps.push(newFontFamilyProperty);
                        }
                    }
                }
            }
        },

        ObjectExpression(path) {
            if (path.parent && t.isObjectProperty(path.parent)) {
                const parentProp = path.parent;
                if (t.isIdentifier(parentProp.key) && parentProp.key.name === 'theme') {
                    const fontFamilyProperty = path.node.properties.find((prop) =>
                        isPropertyWithName(prop, 'fontFamily'),
                    );

                    if (fontFamilyProperty && t.isObjectProperty(fontFamilyProperty)) {
                        const fontFamilyValue = fontFamilyProperty.value;
                        if (t.isObjectExpression(fontFamilyValue)) {
                            const fontFamilyProps = fontFamilyValue.properties;
                            const newFontFamilyProperty = createFontFamilyProperty(font);
                            fontFamilyProps.push(newFontFamilyProperty);
                        }
                    }
                }
            }
        },
    });

    return generate(ast, {}, content).code;
}

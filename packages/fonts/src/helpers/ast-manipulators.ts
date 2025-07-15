import type { Font } from '@onlook/models';
import { parse, traverse, generate, type t as T, types as t, type NodePath } from '@onlook/parser';
import { createFontFamilyProperty } from './ast-generators';
import {
    hasPropertyName,
    isTailwindThemeProperty,
    isValidLocalFontDeclaration,
} from './validators';

/**
 * Removes a font from the configuration AST by eliminating its import, export declaration, and associated files.
 * Handles both Google Fonts and local fonts, cleaning up unused imports and tracking files for deletion.
 * For local fonts, extracts file paths from the src configuration for cleanup.
 * 
 * @param font - The font object containing ID and family name to remove
 * @param content - The source code content to parse and modify
 * @returns Object containing removal status, files to delete, and modified AST
 
 */
export function removeFontDeclaration(font: Font, content: string) {
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
                                            if (fontFilePath.startsWith('./')) {
                                                fontFilePath = fontFilePath.substring(2); // Remove './' prefix
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

    if (!hasRemainingLocalFonts) {
        // Remove the localFont import if no localFont declarations remain
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/font/local') {
                    path.remove();
                }
            },
        });
    }

    return { removedFont, fontFilesToDelete, ast };
}

/**
 * Removes a specific font from the Tailwind CSS theme configuration in the AST.
 * Finds the theme.fontFamily object and removes the specified font ID property,
 * preserving other font family configurations.
 * 
 * @param fontId - The font identifier to remove from the theme configuration
 * @param content - The Tailwind config file content to parse and modify
 * @returns Modified source code string with the font removed from theme.fontFamily
 
 */
export function removeFontFromTailwindTheme(fontId: string, content: string): string {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
        ObjectProperty(path) {
            if (isTailwindThemeProperty(path)) {
                const value = path.node.value;
                if (t.isObjectExpression(value)) {
                    const fontFamilyProperty = value.properties.find((prop) =>
                        hasPropertyName(prop, 'fontFamily'),
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

/**
 * Adds a font to the Tailwind CSS theme configuration by inserting it into the fontFamily object.
 * Locates the theme.fontFamily property and appends the new font configuration,
 * creating the proper CSS variable reference and fallback structure.
 * 
 * @param font - The font object containing ID, variable name, and other metadata
 * @param content - The Tailwind config file content to parse and modify
 * @returns Modified source code string with the font added to theme.fontFamily
 
 */
export function addFontToTailwindTheme(font: Font, content: string): string {
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });

    let themeFound = false;

    const newFontFamilyProperty = createFontFamilyProperty(font);

    traverse(ast, {
        ObjectProperty(path) {
            if (isTailwindThemeProperty(path)) {
                themeFound = true;
                const value = path.node.value;
                if (t.isObjectExpression(value)) {
                    const fontFamilyProperty = value.properties.find((prop) =>
                        hasPropertyName(prop, 'fontFamily'),
                    );
                    // If fontFamilyProperty exists, add the new font to the existing fontFamily object
                    if (fontFamilyProperty && t.isObjectProperty(fontFamilyProperty)) {
                        const fontFamilyValue = fontFamilyProperty.value;
                        if (t.isObjectExpression(fontFamilyValue)) {
                            //Check if the font already exists
                            const fontExists = fontFamilyValue.properties.some((prop) =>
                                hasPropertyName(prop, font.id),
                            );
                            if (!fontExists) {
                                // If the font doesn't exist, add it
                                const fontFamilyProps = fontFamilyValue.properties;
                                fontFamilyProps.push(
                                    t.objectProperty(
                                        t.identifier(font.id),
                                        t.arrayExpression([
                                            t.stringLiteral(`var(${font.variable})`),
                                            t.stringLiteral('sans-serif'),
                                        ]),
                                    ),
                                );
                            }
                        }
                    }
                    // If fontFamilyProperty doesn't exist, create it
                    else {
                        value.properties.push(newFontFamilyProperty);
                    }
                }
            }
        },
    });
    // If object property `theme` doesn't exist, create it

    if (!themeFound) {
        traverse(ast, {
            ObjectExpression(path) {
                if (
                    path.parent.type === 'VariableDeclarator' ||
                    path.parent.type === 'ReturnStatement'
                ) {
                    path.node.properties.push(
                        t.objectProperty(
                            t.identifier('theme'),
                            t.objectExpression([newFontFamilyProperty]),
                        ),
                    );
                }
            },
        });
    }

    return generate(ast, {}, content).code;
}

/**
 * Merges additional font source files into an existing local font configuration.
 * Finds the specified font declaration and appends new source objects to its src array,
 * allowing multiple font files (different weights, styles) to be combined under one font.
 * 
 * @param ast - The AST file containing font declarations to modify
 * @param fontNode - The specific export declaration node to target for merging
 * @param fontName - The name of the font variable to merge sources into
 * @param fontsSrc - Array of font source objects to append to the existing src array
 
 */
export function mergeLocalFontSources(
    ast: T.File,
    fontNode: T.ExportNamedDeclaration,
    fontName: string,
    fontsSrc: T.ObjectExpression[],
): void {
    traverse(ast, {
        ExportNamedDeclaration(path: NodePath<T.ExportNamedDeclaration>) {
            if (path.node === fontNode && path.node.declaration) {
                const declaration = path.node.declaration;
                if (t.isVariableDeclaration(declaration) && declaration.declarations.length > 0) {
                    const declarator = declaration.declarations[0];
                    if (declarator && isValidLocalFontDeclaration(declarator, fontName)) {
                        const configObject = t.isCallExpression(declarator.init)
                            ? (declarator.init.arguments[0] as T.ObjectExpression)
                            : null;
                        if (configObject && t.isObjectExpression(configObject)) {
                            const srcProp = configObject.properties.find((prop) =>
                                hasPropertyName(prop, 'src'),
                            );
                            if (
                                srcProp &&
                                t.isObjectProperty(srcProp) &&
                                t.isArrayExpression(srcProp.value)
                            ) {
                                srcProp.value.elements.push(...fontsSrc);
                            }
                        }
                    }
                }
            }
        },
    });
}

/**
 * Adds a new Google Font import specifier to an existing 'next/font/google' import declaration.
 * Finds the Google Fonts import statement and appends the new font name to the import list,
 * enabling the font to be used in the configuration.
 * 
 * @param ast - The AST file containing import declarations to modify
 * @param importName - The Google Font name to add to the import specifiers (with underscores for spaces)
 
 */
export function addGoogleFontSpecifier(ast: T.File, importName: string): void {
    traverse(ast, {
        ImportDeclaration(path: NodePath<T.ImportDeclaration>) {
            if (path.node.source.value === 'next/font/google') {
                const newSpecifiers = [...path.node.specifiers];
                newSpecifiers.push(
                    t.importSpecifier(t.identifier(importName), t.identifier(importName)),
                );
                path.node.specifiers = newSpecifiers;
            }
        },
    });
}

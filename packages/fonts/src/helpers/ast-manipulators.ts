import { createAndInsertImport } from '@onlook/fonts';
import type { Font } from '@onlook/models';
import {
    generate,
    getAstFromContent,
    types as t,
    traverse,
    type NodePath,
    type t as T,
} from '@onlook/parser';
import { createFontFamilyProperty } from './ast-generators';
import {
    hasPropertyName,
    isTailwindThemeProperty,
    isValidLocalFontDeclaration,
} from './validators';

/**
 * Finds the fontFamily property within the Tailwind theme structure.
 * Navigates through theme -> extend -> fontFamily path and returns the relevant objects.
 *
 * @param themeValue - The theme object expression
 * @returns Object containing extend property, fontFamily property, and fontFamily value, or null if not found
 */
function findFontFamilyInTheme(themeValue: T.ObjectExpression): {
    extendValue: T.ObjectExpression | null;
    fontFamilyProperty: T.ObjectProperty | null;
    fontFamilyValue: T.ObjectExpression | null;
} {
    const extendProperty = themeValue.properties.find((prop) => hasPropertyName(prop, 'extend'));

    if (!extendProperty || !t.isObjectProperty(extendProperty)) {
        return {
            extendValue: null,
            fontFamilyProperty: null,
            fontFamilyValue: null,
        };
    }

    const extendValue = extendProperty.value;

    if (!t.isObjectExpression(extendValue)) {
        return {
            extendValue: null,
            fontFamilyProperty: null,
            fontFamilyValue: null,
        };
    }

    // Look for fontFamily within extend
    const fontFamilyProperty = extendValue.properties.find((prop) =>
        hasPropertyName(prop, 'fontFamily'),
    );

    if (!fontFamilyProperty || !t.isObjectProperty(fontFamilyProperty)) {
        return {
            extendValue,
            fontFamilyProperty: null,
            fontFamilyValue: null,
        };
    }

    const fontFamilyValue = fontFamilyProperty.value;

    if (!t.isObjectExpression(fontFamilyValue)) {
        return {
            extendValue,
            fontFamilyProperty,
            fontFamilyValue: null,
        };
    }

    return {
        extendValue,
        fontFamilyProperty,
        fontFamilyValue,
    };
}

/**
 * Checks if a declaration is a localFont declaration that should be preserved
 */
function isPreservedLocalFontDeclaration(
    declaration: T.VariableDeclarator,
    fontIdToRemove: string,
): boolean {
    return (
        declaration &&
        t.isIdentifier(declaration.id) &&
        declaration.id.name !== fontIdToRemove &&
        t.isCallExpression(declaration.init) &&
        t.isIdentifier(declaration.init.callee) &&
        declaration.init.callee.name === 'localFont'
    );
}

/**
 * Checks if a declaration is the target font to be removed
 */
function isTargetFontDeclaration(
    declaration: T.VariableDeclarator,
    fontIdToRemove: string,
): boolean {
    return declaration && t.isIdentifier(declaration.id) && declaration.id.name === fontIdToRemove;
}

/**
 * Checks if a declaration is a localFont call with proper structure
 */
function isLocalFontCall(declaration: T.VariableDeclarator): boolean {
    return (
        t.isCallExpression(declaration.init) &&
        t.isIdentifier(declaration.init.callee) &&
        declaration.init.callee.name === 'localFont' &&
        declaration.init.arguments.length > 0 &&
        t.isObjectExpression(declaration.init.arguments[0])
    );
}

/**
 * Extracts font file paths from a local font configuration
 */
function extractFontFilePaths(declaration: T.VariableDeclarator): string[] {
    const fontFiles: string[] = [];

    if (!isLocalFontCall(declaration) || !declaration.init) {
        return fontFiles;
    }

    const callExpression = declaration.init as T.CallExpression;
    const fontConfig = callExpression.arguments[0] as T.ObjectExpression;
    const srcProp = fontConfig.properties.find((prop) => hasPropertyName(prop, 'src'));

    if (srcProp && t.isObjectProperty(srcProp) && t.isArrayExpression(srcProp.value)) {
        srcProp.value.elements.forEach((element) => {
            if (t.isObjectExpression(element)) {
                const pathProp = element.properties.find((prop) => hasPropertyName(prop, 'path'));

                if (pathProp && t.isObjectProperty(pathProp) && t.isStringLiteral(pathProp.value)) {
                    let fontFilePath = pathProp.value.value;
                    if (fontFilePath.startsWith('./')) {
                        fontFilePath = fontFilePath.substring(2); // Remove './' prefix
                    }
                    fontFiles.push(fontFilePath);
                }
            }
        });
    }

    return fontFiles;
}

/**
 * Removes a font from the configuration AST by eliminating its import, export declaration, and associated files.
 * Handles both Google Fonts and local fonts, cleaning up unused imports and tracking files for deletion.
 * For local fonts, extracts file paths from the src configuration for cleanup.
 * 
 * @param font - The font object containing ID and family name to remove
 * @param content - The source code content to parse and modify
 * @returns Object containing removal status, files to delete, and modified AST
 
 */
export function removeFontDeclaration(
    font: Font,
    content: string,
): {
    removedFont: boolean;
    fontFilesToDelete: string[];
    ast: T.File;
} {
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error(`Failed to parse file in removeFontDeclaration`);
    }
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
            if (!t.isVariableDeclaration(path.node.declaration)) {
                return;
            }

            const declarations = path.node.declaration.declarations;

            for (let i = 0; i < declarations.length; i++) {
                const declaration = declarations[i];
                if (!declaration) continue;

                if (isPreservedLocalFontDeclaration(declaration, fontIdToRemove)) {
                    hasRemainingLocalFonts = true;
                    continue;
                }

                if (isTargetFontDeclaration(declaration, fontIdToRemove)) {
                    if (isLocalFontCall(declaration)) {
                        const extractedPaths = extractFontFilePaths(declaration);
                        fontFilesToDelete.push(...extractedPaths);
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
        },
    });

    if (!hasRemainingLocalFonts) {
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
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error(`Failed to parse file in removeFontFromTailwindTheme`);
    }

    traverse(ast, {
        ObjectProperty(path) {
            if (!isTailwindThemeProperty(path)) {
                return;
            }

            const value = path.node.value;

            if (!t.isObjectExpression(value)) {
                return;
            }

            const { extendValue, fontFamilyProperty, fontFamilyValue } =
                findFontFamilyInTheme(value);

            if (fontFamilyProperty && fontFamilyValue) {
                // Filter out the specified font
                const fontFamilyProps = fontFamilyValue.properties.filter((prop) => {
                    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                        return prop.key.name !== fontId;
                    }
                    return true;
                });

                // If font was found and removed
                if (fontFamilyProps.length !== fontFamilyValue.properties.length) {
                    if (fontFamilyProps.length === 0) {
                        // Remove the entire fontFamily property if no fonts left
                        if (extendValue) {
                            extendValue.properties = extendValue.properties.filter(
                                (prop) => !hasPropertyName(prop, 'fontFamily'),
                            );
                        }
                    } else {
                        // Update with remaining fonts
                        fontFamilyValue.properties = fontFamilyProps;
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
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error(`Failed to parse file in addFontToTailwindTheme`);
    }

    let themeFound = false;

    const newFontFamilyProperty = createFontFamilyProperty(font);

    traverse(ast, {
        ObjectProperty(path) {
            if (!isTailwindThemeProperty(path)) {
                return;
            }

            themeFound = true;
            const value = path.node.value;

            if (!t.isObjectExpression(value)) {
                return;
            }

            const { extendValue, fontFamilyProperty, fontFamilyValue } =
                findFontFamilyInTheme(value);

            if (fontFamilyProperty && fontFamilyValue) {
                // Check if the font already exists
                const fontExists = fontFamilyValue.properties.some((prop) =>
                    hasPropertyName(prop, font.id),
                );
                if (!fontExists) {
                    // Add the new font to existing fontFamily
                    fontFamilyValue.properties.push(
                        t.objectProperty(
                            t.identifier(font.id),
                            t.arrayExpression([
                                t.stringLiteral(`var(${font.variable})`),
                                t.stringLiteral('sans-serif'),
                            ]),
                        ),
                    );
                }
            } else if (extendValue) {
                // fontFamily doesn't exist in extend, add it
                extendValue.properties.push(newFontFamilyProperty);
            } else {
                // extend doesn't exist, create it with fontFamily
                value.properties.push(
                    t.objectProperty(
                        t.identifier('extend'),
                        t.objectExpression([newFontFamilyProperty]),
                    ),
                );
            }
        },
    });

    // If theme doesn't exist, create it with extend and fontFamily
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
                            t.objectExpression([
                                t.objectProperty(
                                    t.identifier('extend'),
                                    t.objectExpression([newFontFamilyProperty]),
                                ),
                            ]),
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

                if (
                    !declaration ||
                    !t.isVariableDeclaration(declaration) ||
                    declaration.declarations.length === 0
                ) {
                    return;
                }

                const declarator = declaration.declarations[0];

                if (!declarator || !isValidLocalFontDeclaration(declarator, fontName)) {
                    return;
                }

                const configObject = t.isCallExpression(declarator.init)
                    ? (declarator.init.arguments[0] as T.ObjectExpression)
                    : null;

                if (!configObject || !t.isObjectExpression(configObject)) {
                    return;
                }

                const srcProp = configObject.properties.find((prop) =>
                    hasPropertyName(prop, 'src'),
                );

                if (srcProp && t.isObjectProperty(srcProp) && t.isArrayExpression(srcProp.value)) {
                    srcProp.value.elements.push(...fontsSrc);
                }
            }
        },
    });
}

/**
 * Adds a new Google Font import specifier to the 'next/font/google' import declaration.
 * If an existing import exists, appends the new font name to the import list.
 * If no import exists, creates a new import statement for the Google font.
 * 
 * @param ast - The AST file containing import declarations to modify
 * @param importName - The Google Font name to add to the import specifiers (with underscores for spaces)
 
 */
export function addGoogleFontSpecifier(ast: T.File, importName: string): void {
    let foundExistingImport = false;

    traverse(ast, {
        ImportDeclaration(path: NodePath<T.ImportDeclaration>) {
            if (path.node.source.value === 'next/font/google') {
                foundExistingImport = true;
                const newSpecifiers = [...path.node.specifiers];
                newSpecifiers.push(
                    t.importSpecifier(t.identifier(importName), t.identifier(importName)),
                );
                path.node.specifiers = newSpecifiers;
            }
        },
    });

    // If no existing Google font import was found, create a new one
    if (!foundExistingImport) {
        createAndInsertImport(ast, importName, 'next/font/google');
    }
}

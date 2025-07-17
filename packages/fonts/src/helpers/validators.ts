import { parse, traverse, type t as T, types as t, type NodePath } from '@onlook/parser';

/**
 * Validates if an AST object property represents a Tailwind CSS theme configuration.
 * Checks that the property key is 'theme' and it's within an object expression context,
 * which is typical for Tailwind config structure.
 *
 * @param path - The AST node path for the object property to validate
 * @returns true if the property is a theme property, false otherwise
 *
 */
export function isTailwindThemeProperty(path: NodePath<T.ObjectProperty>): boolean {
    return (
        t.isIdentifier(path.node.key) &&
        path.node.key.name === 'theme' &&
        path.parent.type === 'ObjectExpression'
    );
}

/**
 * Validates if an object property, method, or spread element has a specific key name.
 * Useful for finding specific properties like 'fontFamily', 'src', 'variable' in font configurations.
 *
 * @param prop - The AST property node to check (ObjectProperty, ObjectMethod, or SpreadElement)
 * @param key - The expected property name to match against
 * @returns true if the property has the specified key name, false otherwise
 *
 */
export function hasPropertyName(
    prop: T.ObjectMethod | T.ObjectProperty | T.SpreadElement,
    key: string,
): boolean {
    return t.isObjectProperty(prop) && t.isIdentifier(prop.key) && prop.key.name === key;
}

/**
 * Validates if a variable declarator represents a properly structured local font declaration.
 * Checks for correct variable name, localFont function call, and object configuration structure.
 * Ensures the declaration follows Next.js localFont patterns.
 * 
 * @param declarator - The variable declarator AST node to validate
 * @param fontName - The expected font variable name to match
 * @returns true if the declaration is a valid local font setup, false otherwise

 */
export function isValidLocalFontDeclaration(
    declarator: T.VariableDeclarator,
    fontName: string,
): boolean {
    return (
        t.isIdentifier(declarator.id) &&
        declarator.id.name === fontName &&
        !!declarator.init &&
        t.isCallExpression(declarator.init) &&
        t.isIdentifier(declarator.init.callee) &&
        declarator.init.callee.name === 'localFont' &&
        declarator.init.arguments.length > 0 &&
        t.isObjectExpression(declarator.init.arguments[0])
    );
}

/**
 * Checks if a Next.js local font import statement exists in the AST.
 * Scans through import declarations to find 'next/font/local' imports,
 * which are required for using localFont function.
 *
 * @param ast - The AST file to search for local font imports
 * @returns true if localFont import exists, false otherwise
 *
 */
export function hasLocalFontImport(ast: T.File): boolean {
    return ast.program.body.some((node) => {
        if (t.isImportDeclaration(node)) {
            return node.source.value === 'next/font/local';
        }
        return false;
    });
}

/**
 * Searches for an existing font export declaration by name and returns both existence status and the node.
 * Traverses export declarations to find matching font variable names,
 * useful for preventing duplicates and enabling font updates.
 * 
 * @param ast - The AST file to search through
 * @param fontName - The font variable name to search for
 * @returns Object containing existence boolean and the found export node (if any)

 */
export function findFontExportDeclaration(
    ast: T.File,
    fontName: string,
): { fontNameExists: boolean; existingFontNode: T.ExportNamedDeclaration | null } {
    let fontNameExists = false;
    let existingFontNode: T.ExportNamedDeclaration | null = null;

    traverse(ast, {
        ExportNamedDeclaration(path: NodePath<T.ExportNamedDeclaration>) {
            if (
                path.node.declaration &&
                t.isVariableDeclaration(path.node.declaration) &&
                path.node.declaration.declarations.some(
                    (declaration: T.VariableDeclarator) =>
                        t.isIdentifier(declaration.id) && declaration.id.name === fontName,
                )
            ) {
                fontNameExists = true;
                existingFontNode = path.node;
            }
        },
    });
    return { fontNameExists, existingFontNode };
}

/**
 * Comprehensively validates Google Font import and export status in source code.
 * Parses content and checks for Google Font import declaration, specific font import,
 * and font export declaration. Essential for font management operations.
 *
 * @param content - The source code content to analyze
 * @param importName - The Google Font import name to search for (e.g., 'Inter', 'Open_Sans')
 * @param fontName - The font variable name to search for in exports (e.g., 'inter', 'openSans')
 * @returns Object with three boolean flags indicating import and export status
 *
 */
export function validateGoogleFontSetup(
    content: string,
    importName: string,
    fontName: string,
): { hasGoogleFontImport: boolean; hasImportName: boolean; hasFontExport: boolean } {
    if (!content) {
        return { hasGoogleFontImport: false, hasImportName: false, hasFontExport: false };
    }

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

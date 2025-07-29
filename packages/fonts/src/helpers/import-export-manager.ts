import { generate, traverse, types as t, type t as T, type NodePath } from '@onlook/parser';
import { createAndInsertImport } from '@onlook/fonts';

/**
 * Removes a font import from a file using AST traversal
 * @param fontImportPath - The import path to remove the font import from (e.g. './fonts')
 * @param fontName - The font name to remove from the import
 * @param ast - The parsed AST of the file
 * @returns The updated file content with the font import removed, or null if no changes made
 */
export function removeFontImportFromFile(
    fontImportPath: string,
    fontName: string,
    ast: T.File,
): string | null {
    let foundImport = false;
    let importRemoved = false;

    traverse(ast, {
        ImportDeclaration(path: NodePath<T.ImportDeclaration>) {
            if (path.node.source.value === fontImportPath) {
                foundImport = true;

                // Find the specifier to remove
                const specifierIndex = path.node.specifiers.findIndex(
                    (spec) =>
                        t.isImportSpecifier(spec) &&
                        t.isIdentifier(spec.imported) &&
                        spec.imported.name === fontName,
                );

                if (specifierIndex !== -1) {
                    importRemoved = true;

                    // Remove the specifier
                    path.node.specifiers.splice(specifierIndex, 1);

                    // If no specifiers left, remove the entire import
                    if (path.node.specifiers.length === 0) {
                        path.remove();
                    }
                }
            }
        },
    });

    if (!foundImport || !importRemoved) {
        return null;
    }

    return generate(ast).code;
}

/**
 * Adds a font import to a file using AST traversal
 * @param fontImportPath - The import path to add the font import to (e.g. './fonts')
 * @param fontName - The font name to add to the import
 * @param ast - The AST file to modify
 * @returns The updated file content with the font import added, or null if no changes needed
 */
export function addFontImportToFile(
    fontImportPath: string,
    fontName: string,
    ast: T.File,
): string | null {
    let foundExistingImport = false;
    let fontAlreadyExists = false;

    traverse(ast, {
        ImportDeclaration(path: NodePath<T.ImportDeclaration>) {
            if (path.node.source.value === fontImportPath) {
                foundExistingImport = true;

                // Check if the font name already exists in the import
                const existingSpecifier = path.node.specifiers.find(
                    (spec) =>
                        t.isImportSpecifier(spec) &&
                        t.isIdentifier(spec.imported) &&
                        spec.imported.name === fontName,
                );

                if (existingSpecifier) {
                    fontAlreadyExists = true;
                } else {
                    // Add the new font to the existing import
                    path.node.specifiers.push(
                        t.importSpecifier(t.identifier(fontName), t.identifier(fontName)),
                    );
                }
            }
        },
    });

    if (fontAlreadyExists) {
        return null;
    }

    if (!foundExistingImport) {
        createAndInsertImport(ast, fontName, fontImportPath);
    }

    return generate(ast).code;
}

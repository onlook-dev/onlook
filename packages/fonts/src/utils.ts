import { type Font, type RawFont, RouterType } from '@onlook/models';
import { types as t, type t as T } from '@onlook/parser';

/**
 * Converts a RawFont to a Font
 */
export function convertRawFont(font: RawFont): Font {
    return {
        ...font,
        weight: font.weights,
        styles: font.styles || [],
        variable: `--font-${font.id}`,
    };
}

/**
 * Gets target elements based on router type
 */
export function getFontRootElements(type: RouterType): string[] {
    if (type === RouterType.APP) return ['html', 'body'];
    return ['div', 'main', 'section', 'body'];
}

/**
 * Creates a new import declaration and inserts it at the correct position in the AST
 * @param ast - The AST file to modify
 * @param importName - The name to import
 * @param sourcePath - The import source path
 */
export function createAndInsertImport(ast: T.File, importName: string, sourcePath: string): void {
    const newImport = t.importDeclaration(
        [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
        t.stringLiteral(sourcePath),
    );

    let insertionIndex = 0;
    for (let i = 0; i < ast.program.body.length; i++) {
        if (t.isImportDeclaration(ast.program.body[i])) {
            insertionIndex = i + 1;
        } else {
            break;
        }
    }

    ast.program.body.splice(insertionIndex, 0, newImport);
}

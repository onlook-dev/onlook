import { generate, type t as T } from '@onlook/parser';
import { cleanComma } from '../utils';

/**
 * Removes a font import from a file
 */
export function removeFontImportFromFile(
    fontImportPath: string,
    fontName: string,
    fileContent: string,
    ast: T.File,
): string | null {
    const importRegex = new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"]${fontImportPath}['"]`);
    const importMatch = fileContent.match(importRegex);

    let newContent = generate(ast).code;

    if (importMatch?.[1]) {
        const currentImports = importMatch[1];
        const newImports = currentImports
            .split(',')
            .map((imp) => imp.trim())
            .filter((imp) => {
                const importName = imp.split(' as ')[0]?.trim();
                return importName !== fontName;
            })
            .join(', ');

        if (newImports) {
            const formattedNewImports = cleanComma(newImports);
            newContent = newContent.replace(
                importRegex,
                `import { ${formattedNewImports} } from '${fontImportPath}'`,
            );
        } else {
            // Remove the entire import statement including the semicolon and optional newline
            newContent = newContent.replace(new RegExp(`${importRegex.source};?\\n?`), '');
        }
    } else {
        console.error('No import found');
        return null;
    }
    return newContent;
}

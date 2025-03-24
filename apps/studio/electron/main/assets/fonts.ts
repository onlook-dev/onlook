import * as fs from 'fs';
import * as pathModule from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { readFile } from '../code/files';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';

export async function scanFonts(projectRoot: string): Promise<Font[]> {
    try {
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

                                // Handle variable property (string)
                                if (propName === 'variable' && t.isStringLiteral(prop.value)) {
                                    fontConfig.variable = prop.value.value;
                                }

                                // Handle subsets property (array)
                                if (propName === 'subsets' && t.isArrayExpression(prop.value)) {
                                    fontConfig.subsets = prop.value.elements
                                        .filter((element): element is t.StringLiteral =>
                                            t.isStringLiteral(element),
                                        )
                                        .map((element) => element.value);
                                }

                                // Handle weight property (array)
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

                                // Handle style property (array)
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

export async function addFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        const content = await readFile(fontPath);

        if (!content) {
            return;
        }

        // Convert the font family to the import name format (Pascal case, no spaces)
        const importName = font.family.replace(/\s+/g, '_');
        const fontName = font.id
            .split('-')
            .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
            .join('');
        // Check if the import already exists
        const importRegex = new RegExp(
            `import\\s*{[^}]*${importName}[^}]*}\\s*from\\s*['"]next/font/google['"]`,
        );
        const importExists = importRegex.test(content);

        // Check if the font export already exists
        const exportRegex = new RegExp(`export\\s+const\\s+${fontName}\\s*=`);
        const exportExists = exportRegex.test(content);

        if (exportExists) {
            console.log(`Font ${fontName} already exists in font.ts`);
            return;
        }

        let newContent = content;

        // Add import if it doesn't exist
        if (!importExists) {
            // Check if there's already an import from next/font/google
            const googleImportRegex = /import\s*{([^}]*)}\s*from\s*['"]next\/font\/google['"]/;
            const googleImportMatch = content.match(googleImportRegex);

            if (googleImportMatch) {
                // Add to existing import
                const currentImports = googleImportMatch[1];
                const newImport = currentImports.includes(importName)
                    ? currentImports
                    : `${currentImports}, ${importName}`;
                newContent = newContent.replace(
                    googleImportRegex,
                    `import {${newImport}} from 'next/font/google'`,
                );
            } else {
                // Add new import at the top
                newContent = `import { ${importName} } from 'next/font/google';\n${newContent}`;
            }
        }

        const fontConfig = `
export const ${fontName} = ${importName}({
    subsets: [${font.subsets.map((s) => `'${s}'`).join(', ')}],
    weight: [${font.weight?.join(', ')}],
    style: [${font.styles?.join(', ')}],
    variable: '${font.variable}',
    display: 'swap',
});
`;

        // Add a blank line before the new font if the file doesn't end with blank lines
        if (!newContent.endsWith('\n\n')) {
            if (newContent.endsWith('\n')) {
                newContent += '\n';
            } else {
                newContent += '\n\n';
            }
        }

        newContent += fontConfig;

        await fs.writeFileSync(fontPath, newContent);
        console.log(`Added font ${font.id} to font.ts`);
    } catch (error) {
        console.error('Error adding font:', error);
    }
}

export async function removeFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        const content = await readFile(fontPath);

        if (!content) {
            return;
        }

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        const fontIdToRemove = font.id;
        const importToRemove = font.family.replace(/\s+/g, '_');
        let removedFont = false;
        const remainingImports: string[] = [];

        // Track all imports from next/font/google to know if we should remove the import
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/font/google') {
                    // Check if our font is in this import
                    const importSpecifiers = path.node.specifiers.filter((specifier) => {
                        if (t.isImportSpecifier(specifier) && t.isIdentifier(specifier.imported)) {
                            // Add to remaining imports if not the one we're removing
                            if (specifier.imported.name !== importToRemove) {
                                remainingImports.push(specifier.imported.name);
                                return true;
                            }
                            return false;
                        }
                        return true;
                    });

                    // If there are no other imports from next/font/google, remove the import statement
                    if (importSpecifiers.length === 0) {
                        path.remove();
                    } else if (importSpecifiers.length !== path.node.specifiers.length) {
                        // Update the import statement with remaining imports
                        path.node.specifiers = importSpecifiers;
                    }
                }
            },

            // Find and remove the font export
            ExportNamedDeclaration(path) {
                if (t.isVariableDeclaration(path.node.declaration)) {
                    const declarations = path.node.declaration.declarations;

                    for (let i = 0; i < declarations.length; i++) {
                        const declaration = declarations[i];

                        if (
                            t.isIdentifier(declaration.id) &&
                            declaration.id.name === fontIdToRemove
                        ) {
                            // If there's only one declaration, remove the entire export
                            if (declarations.length === 1) {
                                path.remove();
                            } else {
                                // Otherwise just remove this specific declaration
                                declarations.splice(i, 1);
                            }
                            removedFont = true;
                            break;
                        }
                    }
                }
            },
        });

        // If we found and removed the font, generate new code
        if (removedFont) {
            const { code } = generate(ast);
            await fs.writeFileSync(fontPath, code);
            console.log(`Removed font ${fontIdToRemove} from font.ts`);
        } else {
            console.log(`Font ${fontIdToRemove} not found in font.ts`);
        }
    } catch (error) {
        console.error('Error removing font:', error);
    }
}

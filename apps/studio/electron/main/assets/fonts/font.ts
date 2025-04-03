import * as pathModule from 'path';
import { DefaultSettings } from '@onlook/models/constants';
import type { Font } from '@onlook/models/assets';
import { camelCase } from 'lodash';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { formatContent, readFile, writeFile } from '../../code/files';
import fs from 'fs';
import { extractFontParts, getFontFileName } from '@onlook/utility';

/**
 * Adds a new font to the project by:
 * 1. Adding the font import and configuration to fonts.ts
 * 2. Updating Tailwind config with the new font family
 * 3. Adding the font variable to the appropriate layout file
 */
export async function addFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);
        const content = (await readFile(fontPath)) ?? '';

        // Convert the font family to the import name format (Pascal case, no spaces)
        const importName = font.family.replace(/\s+/g, '_');
        const fontName = camelCase(font.id);

        // Parse the file content using Babel
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        let hasGoogleFontImport = false;
        let hasImportName = false;
        let hasFontExport = false;

        // Check if import and export already exists
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/font/google') {
                    hasGoogleFontImport = true;

                    // Check if this specific font is already imported
                    path.node.specifiers.forEach((specifier) => {
                        if (
                            t.isImportSpecifier(specifier) &&
                            t.isIdentifier(specifier.imported) &&
                            specifier.imported.name === importName
                        ) {
                            hasImportName = true;
                        }
                    });
                }
            },

            ExportNamedDeclaration(path) {
                if (
                    t.isVariableDeclaration(path.node.declaration) &&
                    path.node.declaration.declarations.some(
                        (declaration) =>
                            t.isIdentifier(declaration.id) && declaration.id.name === fontName,
                    )
                ) {
                    hasFontExport = true;
                }
            },
        });

        if (hasFontExport) {
            console.log(`Font ${fontName} already exists in font.ts`);
            return;
        }

        // Create the AST nodes for the new font
        const fontConfigObject = t.objectExpression([
            t.objectProperty(
                t.identifier('subsets'),
                t.arrayExpression(font.subsets.map((s) => t.stringLiteral(s))),
            ),
            t.objectProperty(
                t.identifier('weight'),
                t.arrayExpression((font.weight || []).map((w) => t.stringLiteral(w))),
            ),
            t.objectProperty(
                t.identifier('style'),
                t.arrayExpression((font.styles || []).map((s) => t.stringLiteral(s))),
            ),
            t.objectProperty(t.identifier('variable'), t.stringLiteral(font.variable)),
            t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
        ]);

        const fontDeclaration = t.variableDeclaration('const', [
            t.variableDeclarator(
                t.identifier(fontName),
                t.callExpression(t.identifier(importName), [fontConfigObject]),
            ),
        ]);

        const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

        // Add the export declaration to the end of the file
        ast.program.body.push(exportDeclaration);

        // Add or update the import if needed
        if (!hasGoogleFontImport) {
            // Add new import from next/font/google
            const importDeclaration = t.importDeclaration(
                [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
                t.stringLiteral('next/font/google'),
            );

            ast.program.body.unshift(importDeclaration);
        } else if (!hasImportName) {
            // Update existing import to include the new font
            traverse(ast, {
                ImportDeclaration(path) {
                    if (path.node.source.value === 'next/font/google') {
                        path.node.specifiers.push(
                            t.importSpecifier(t.identifier(importName), t.identifier(importName)),
                        );
                    }
                },
            });
        }

        // Generate the new code from the AST
        const { code } = generate(ast);

        // Write the updated content back to the file
        const formattedCode = await formatContent(fontPath, code);
        await writeFile(fontPath, formattedCode);
    } catch (error) {
        console.error('Error adding font:', error);
    }
}

/**
 * Removes a font from the project by:
 * 1. Removing the font from fonts.ts
 * 2. Removing the font from Tailwind config
 * 3. Removing the font variable from the layout file
 * 4. Updating default font if needed
 * 5. Deleting the font files from the fonts directory
 * 6. Removing localFont import if no longer used
 */
export async function removeFont(projectRoot: string, font: Font) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);
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
        const fontFilesToDelete: string[] = [];
        // Track if any localFont declarations remain after removal
        let hasRemainingLocalFonts = false;

        // Track all imports from next/font/google to know if we should remove the import
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
                            t.isIdentifier(declaration.id) &&
                            declaration.id.name !== fontIdToRemove &&
                            t.isCallExpression(declaration.init) &&
                            t.isIdentifier(declaration.init.callee) &&
                            declaration.init.callee.name === 'localFont'
                        ) {
                            hasRemainingLocalFonts = true;
                        }

                        if (
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

        if (removedFont) {
            let { code } = generate(ast);

            // Remove localFont import if no localFont declarations remain
            if (!hasRemainingLocalFonts) {
                const localFontImportRegex =
                    /import\s+localFont\s+from\s+['"]next\/font\/local['"];\n?/g;
                code = code.replace(localFontImportRegex, '');
            }
            const formattedCode = await formatContent(fontPath, code);
            await writeFile(fontPath, formattedCode);

            // Delete font files if found
            if (fontFilesToDelete.length > 0) {
                for (const fileRelativePath of fontFilesToDelete) {
                    const absoluteFilePath = pathModule.join(projectRoot, fileRelativePath);
                    if (fs.existsSync(absoluteFilePath)) {
                        try {
                            fs.unlinkSync(absoluteFilePath);
                            console.log(`Deleted font file: ${absoluteFilePath}`);
                        } catch (error) {
                            console.error(`Error deleting font file ${absoluteFilePath}:`, error);
                        }
                    } else {
                        console.log(`Font file not found: ${absoluteFilePath}`);
                    }
                }
            }
        } else {
            console.log(`Font ${fontIdToRemove} not found in font.ts`);
        }
    } catch (error) {
        console.error('Error removing font:', error);
    }
}

export async function addFonts(projectRoot: string, fonts: Font[]) {
    for (const font of fonts) {
        await addFont(projectRoot, font);
    }
}

/**
 * Adds a local font to the project by:
 * 1. Saving the font files to the fonts folder
 * 2. Adding the font configuration to fonts.ts using next/font/local
 */
export async function addLocalFont(
    projectRoot: string,
    fontFiles: {
        file: { name: string; buffer: number[] };
        name: string;
        weight: string;
        style: string;
    }[],
) {
    try {
        const fontPath = pathModule.join(projectRoot, DefaultSettings.FONT_CONFIG);
        const content = (await readFile(fontPath)) ?? '';

        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        // Check if the localFont import already exists
        let hasLocalFontImport = false;

        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === 'next/font/local') {
                    hasLocalFontImport = true;
                }
            },
        });

        // Create fonts directory if it doesn't exist
        const fontsDir = pathModule.join(projectRoot, DefaultSettings.FONT_FOLDER);
        if (!fs.existsSync(fontsDir)) {
            fs.mkdirSync(fontsDir, { recursive: true });
        }
        // Extract the base font name from the first file
        const baseFontName = extractFontParts(fontFiles[0].file.name)?.family;
        const fontName = camelCase(`custom-${baseFontName}`);

        let fontNameExists = false;
        let existingFontNode: t.ExportNamedDeclaration | null = null;

        traverse(ast, {
            ExportNamedDeclaration(path) {
                if (
                    t.isVariableDeclaration(path.node.declaration) &&
                    path.node.declaration.declarations.some(
                        (declaration) =>
                            t.isIdentifier(declaration.id) && declaration.id.name === fontName,
                    )
                ) {
                    fontNameExists = true;
                    existingFontNode = path.node;
                }
            },
        });

        // Save font files and prepare font configuration
        const fontConfigs = await Promise.all(
            fontFiles.map(async (fontFile) => {
                const weight = fontFile.weight;
                const style = fontFile.style.toLowerCase();
                const fileName = getFontFileName(baseFontName, weight, style);
                const filePath = pathModule.join(
                    fontsDir,
                    `${fileName}.${fontFile.file.name.split('.').pop()}`,
                );

                // Save the file
                const buffer = Buffer.from(fontFile.file.buffer);
                await writeFile(filePath, buffer.toString('base64'));

                return {
                    path: pathModule.join(
                        DefaultSettings.FONT_FOLDER,
                        `${fileName}.${fontFile.file.name.split('.').pop()}`,
                    ),
                    weight,
                    style,
                };
            }),
        );

        const srcArrayElements = fontConfigs.map((config) =>
            t.objectExpression([
                t.objectProperty(t.identifier('path'), t.stringLiteral(`../${config.path}`)),
                t.objectProperty(t.identifier('weight'), t.stringLiteral(config.weight)),
                t.objectProperty(t.identifier('style'), t.stringLiteral(config.style)),
            ]),
        );

        if (fontNameExists && existingFontNode) {
            // Merge new font configurations with existing ones
            traverse(ast, {
                ExportNamedDeclaration(path) {
                    if (path.node === existingFontNode) {
                        const declaration = path.node.declaration;
                        if (t.isVariableDeclaration(declaration)) {
                            const declarator = declaration.declarations[0];
                            if (
                                t.isIdentifier(declarator.id) &&
                                declarator.id.name === fontName &&
                                t.isCallExpression(declarator.init) &&
                                t.isIdentifier(declarator.init.callee) &&
                                declarator.init.callee.name === 'localFont' &&
                                declarator.init.arguments.length > 0 &&
                                t.isObjectExpression(declarator.init.arguments[0])
                            ) {
                                const configObject = declarator.init.arguments[0];
                                const srcProp = configObject.properties.find(
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
                                    srcProp.value.elements.push(...srcArrayElements);
                                }
                            }
                        }
                    }
                },
            });
        } else {
            // Create a new font configuration
            const fontConfigObject = t.objectExpression([
                t.objectProperty(t.identifier('src'), t.arrayExpression(srcArrayElements)),
                t.objectProperty(t.identifier('variable'), t.stringLiteral(`--font-${fontName}`)),
                t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
            ]);

            const fontDeclaration = t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.identifier(fontName),
                    t.callExpression(t.identifier('localFont'), [fontConfigObject]),
                ),
            ]);

            const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

            ast.program.body.push(exportDeclaration);

            if (!hasLocalFontImport) {
                const importDeclaration = t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier('localFont'))],
                    t.stringLiteral('next/font/local'),
                );
                ast.program.body.unshift(importDeclaration);
            }
        }

        const { code } = generate(ast);
        const formattedCode = await formatContent(fontPath, code);
        await writeFile(fontPath, formattedCode);

        return fontName;
    } catch (error) {
        console.error('Error adding local font:', error);
        throw error;
    }
}
